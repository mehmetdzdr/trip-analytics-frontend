import { HttpClient } from '@angular/common/http';
import {
    AfterViewInit,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges
} from '@angular/core';
import * as L from 'leaflet';
import { ZoneSummaryDTO } from '../../../models/zone.model';

@Component({
    selector: 'app-nyc-map',
    standalone: true,
    template: `<div id="nyc-map"></div>`,
    styles: [`
    #nyc-map {
      width: 100%;
      height: 100%;
    }
  `]
})
export class NycMapComponent implements AfterViewInit, OnChanges {

    @Input() zones: ZoneSummaryDTO[] = [];
    @Input() selectedHour = 18;
    @Input() pairMode = false;
    @Input() firstPin: string | null = null;

    @Output() zoneClick = new EventEmitter<string>();

    private map!: L.Map;
    private geoJsonLayer!: L.GeoJSON;
    private zoneMap = new Map<string, ZoneSummaryDTO>();

    // Her saat için max değer — renk skalası için
    private maxByHour: number[] = new Array(24).fill(0);

    constructor(private http: HttpClient) { }

    ngAfterViewInit(): void {
        this.initMap();
        this.loadGeoJson();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // zones gelince zoneMap'i doldur ve max hesapla
        if (changes['zones'] && this.zones.length > 0) {
            this.buildZoneMap();
            if (this.geoJsonLayer) this.refreshColors();
        }

        // Saat değişince renkleri güncelle
        if (changes['selectedHour'] && this.geoJsonLayer) {
            this.refreshColors();
        }
    }

    private initMap(): void {
        this.map = L.map('nyc-map', {
            center: [40.7128, -74.0060],  // NYC merkezi
            zoom: 11,
            zoomControl: true,
            scrollWheelZoom: true,
        });

        // Dark tile layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO',
            maxZoom: 19
        }).addTo(this.map);
    }

    private loadGeoJson(): void {
        this.http.get('nyc-zip-code-tabulation-areas-polygons.geojson').subscribe({
            next: (geoJson: any) => {
                this.geoJsonLayer = L.geoJSON(geoJson, {
                    style: (feature) => this.getStyle(feature),
                    onEachFeature: (feature, layer) => this.onEachFeature(feature, layer)
                }).addTo(this.map);

                setTimeout(() => {
                    this.map.fitBounds(this.geoJsonLayer.getBounds(), { padding: [20, 20] });
                    this.refreshColors();
                }, 100);
            }
        });
    }

    private buildZoneMap(): void {
        console.log('pickupsByHour sample:', this.zones[0].pickupsByHour);
        console.log('zone keys:', Object.keys(this.zones[0]));
        this.zoneMap.clear();
        this.zones.forEach(z => this.zoneMap.set(z.postalCode, z));

        // Her saat için max pickup hesapla (renk skalası normalize için)
        for (let h = 0; h < 24; h++) {
            this.maxByHour[h] = Math.max(
                ...this.zones.map(z => z.pickupsByHour?.[h] ?? 0)
            );
        }

        console.log('zones count:', this.zones.length);
        console.log('maxByHour[18]:', this.maxByHour[18]);
        console.log('sample zone:', this.zones[0]);
    }

    private getStyle(feature: any): L.PathOptions {
        const postalCode = feature?.properties?.postalCode;
        const zone = this.zoneMap.get(postalCode);

        if (!zone) {
            return {
                fillColor: '#2a2f45',
                fillOpacity: 0.4,
                color: '#1a1d27',
                weight: 0.5
            };
        }

        const value = zone.pickupsByHour?.[this.selectedHour] ?? 0;
        const max = this.maxByHour[this.selectedHour] || 1;
        const intensity = value / max; // 0.0 → 1.0

        return {
            fillColor: this.getColor(intensity),
            fillOpacity: 0.75,
            color: '#0f1117',
            weight: 1
        };
    }

    private getColor(intensity: number): string {
        // 0.0 → 0.25 : koyu yeşil → yeşil
        // 0.25 → 0.5 : yeşil → sarı
        // 0.5 → 0.75 : sarı → turuncu
        // 0.75 → 1.0 : turuncu → kırmızı

        let r: number, g: number, b: number;

        if (intensity < 0.25) {
            const t = intensity / 0.25;
            r = Math.round(20 + (50 - 20) * t);
            g = Math.round(120 + (200 - 120) * t);
            b = Math.round(20 + (50 - 20) * t);
        } else if (intensity < 0.5) {
            const t = (intensity - 0.25) / 0.25;
            r = Math.round(50 + (240 - 50) * t);
            g = Math.round(200 + (220 - 200) * t);
            b = Math.round(50 + (20 - 50) * t);
        } else if (intensity < 0.75) {
            const t = (intensity - 0.5) / 0.25;
            r = Math.round(240 + (255 - 240) * t);
            g = Math.round(220 + (140 - 220) * t);
            b = Math.round(20 + (0 - 20) * t);
        } else {
            const t = (intensity - 0.75) / 0.25;
            r = Math.round(255 + (180 - 255) * t);
            g = Math.round(140 + (0 - 140) * t);
            b = 0;
        }

        return `rgb(${r},${g},${b})`;
    }

    private onEachFeature(feature: any, layer: L.Layer): void {
        const postalCode = feature?.properties?.postalCode;

        layer.on({
            click: () => {
                this.zoneClick.emit(postalCode);
            },
            mouseover: (e) => {
                const l = e.target as L.Path;
                l.setStyle({ weight: 2, color: '#4f8ef7', fillOpacity: 0.9 });
            },
            mouseout: (e) => {
                this.geoJsonLayer.resetStyle(e.target);
            }
        });
    }

    private refreshColors(): void {
        this.geoJsonLayer.eachLayer((layer: any) => {
            const feature = layer.feature;
            layer.setStyle(this.getStyle(feature));
        });
    }
}