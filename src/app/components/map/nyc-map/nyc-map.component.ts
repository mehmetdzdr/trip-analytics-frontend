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
    @Input() densityMode: 'absolute' | 'relative' = 'absolute';
    @Input() tripMode: 'pickup' | 'dropoff' = 'pickup';

    @Output() zoneClick = new EventEmitter<string>();

    private map!: L.Map;
    private geoJsonLayer!: L.GeoJSON;
    private zoneMap = new Map<string, ZoneSummaryDTO>();

    // Her saat için max değer — renk skalası için
    private maxShareByHour: number[] = new Array(24).fill(0);
    private totalByHour: number[] = new Array(24).fill(0);
    private maxByHour: number[] = new Array(24).fill(0);
    private maxByHourDropff: number[] = new Array(24).fill(0);
    private totalByHourDropoff: number[] = new Array(24).fill(0);
    private maxShareByHourDropoff: number[] = new Array(24).fill(0);

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

        // firstPin değişince kesikli çizgi göster
        if (changes['firstPin'] && this.geoJsonLayer) {
            this.updatePinStyle();
        }

        if (changes['densityMode'] && this.geoJsonLayer) {
            this.refreshColors();
        }

        if (changes['tripMode'] && this.geoJsonLayer) {
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
        this.zoneMap.clear();
        this.zones.forEach(z => this.zoneMap.set(z.postalCode, z));

        for (let h = 0; h < 24; h++) {
            this.totalByHour[h] = this.zones.reduce((sum, z) => sum + (z.pickupsByHour?.[h] ?? 0), 0);
            this.maxByHour[h] = Math.max(...this.zones.map(z => z.pickupsByHour?.[h] ?? 0));
            const pickupShares = this.zones.map(z => (z.pickupsByHour?.[h] ?? 0) / (this.totalByHour[h] || 1));
            this.maxShareByHour[h] = Math.max(...pickupShares) || 1;

            this.totalByHourDropoff[h] = this.zones.reduce((sum, z) => sum + (z.dropoffsByHour?.[h] ?? 0), 0);
            this.maxByHourDropff[h] = Math.max(...this.zones.map(z => z.dropoffsByHour?.[h] ?? 0));
            const dropoffShares = this.zones.map(z => (z.dropoffsByHour?.[h] ?? 0) / (this.totalByHourDropoff[h] || 1));
            this.maxShareByHourDropoff[h] = Math.max(...dropoffShares) || 1;
        }
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

        const hourValue = this.tripMode === 'pickup'
            ? zone.pickupsByHour?.[this.selectedHour] ?? 0
            : zone.dropoffsByHour?.[this.selectedHour] ?? 0;


        let intensity: number;


        if (this.densityMode === 'absolute') {
            const cityTotal = this.tripMode === 'pickup'
                ? this.totalByHour[this.selectedHour] || 1
                : this.totalByHourDropoff[this.selectedHour] || 1;
            const maxShare = this.tripMode === 'pickup'
                ? this.maxShareByHour[this.selectedHour] || 1
                : this.maxShareByHourDropoff[this.selectedHour] || 1;
            const share = hourValue / cityTotal;
            intensity = this.clamp(share / maxShare, 0, 1);
        } else {
            const hourArray = this.tripMode === 'pickup'
                ? zone.pickupsByHour ?? [1]
                : zone.dropoffsByHour ?? [1];

            const zoneMaxHour = Math.max(...hourArray) || 1;
            const zoneMaxHourDaily = zoneMaxHour / 31;

            if (zoneMaxHourDaily < 1) {
                return {
                    fillColor: '#2a2f45',
                    fillOpacity: 0.4,
                    color: '#0f1117',
                    weight: 1
                };
            }
            intensity = this.clamp(hourValue / zoneMaxHour, 0, 1);
        }

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
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                e.originalEvent.stopPropagation();
                e.originalEvent.preventDefault();
                this.zoneClick.emit(postalCode);
            },
            mouseover: (e) => {
                L.DomEvent.stopPropagation(e);
                const l = e.target as L.Path;
                l.setStyle({ weight: 2, color: '#4f8ef7', fillOpacity: 0.9 });
            },
            mouseout: (e) => {
                e.target.setStyle(this.getStyle(feature));
                //this.geoJsonLayer.resetStyle(e.target);
            }
        });
    }

    private refreshColors(): void {
        this.geoJsonLayer.eachLayer((layer: any) => {
            const feature = layer.feature;
            layer.setStyle(this.getStyle(feature));

        });
    }

    private updatePinStyle(): void {
        if (!this.geoJsonLayer) return;
        this.geoJsonLayer.eachLayer((layer: any) => {
            const feature = layer.feature;
            const postalCode = feature?.properties?.postalCode;
            if (postalCode === this.firstPin) {
                layer.setStyle({
                    dashArray: '6, 4',
                    weight: 3,
                    color: '#4f8ef7',
                    fillOpacity: 0.9
                });
            } else {
                layer.setStyle(this.getStyle(feature));
            }
        });
    }

    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

}