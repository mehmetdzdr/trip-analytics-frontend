import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HourSliderComponent } from '../../components/map/hour-slider/hour-slider.component';
import { NycMapComponent } from '../../components/map/nyc-map/nyc-map.component';
import { ZonePopupComponent } from '../../components/map/zone-popup/zone-popup.component';
import { AuthService } from '../../core/services/auth.service';
import { ZoneService } from '../../core/services/zone.service';
import { ZoneDetailDTO, ZonePairDTO, ZoneSummaryDTO } from '../../models/zone.model';
@Component({
    selector: 'app-map-page',
    standalone: true,
    imports: [CommonModule, NycMapComponent, HourSliderComponent, ZonePopupComponent],
    templateUrl: './map-page.component.html',
    styleUrl: './map-page.component.scss'
})
export class MapPageComponent implements OnInit {

    zones: ZoneSummaryDTO[] = [];
    selectedZone: ZoneDetailDTO | null = null;
    selectedHour = 18;
    loading = true;

    // Zone pair
    firstPin: string | null = null;
    secondPin: string | null = null;
    pairResult: ZonePairDTO | null = null;
    pairLoading = false;
    pairError = false;
    pairMode = false;
    densityMode: 'absolute' | 'relative' = 'absolute';
    tripMode: 'pickup' | 'dropoff' = 'pickup';

    constructor(
        private zoneService: ZoneService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef,
        public router: Router
    ) { }

    ngOnInit(): void {
        this.zoneService.getAll().subscribe({
            next: (data) => {
                this.zones = data;
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
    }

    onZoneClick(postalCode: string): void {
        if (this.pairMode) {
            this.handlePairPin(postalCode);
            return;
        }

        this.zoneService.getByPostalCode(postalCode).subscribe({
            next: (detail) => this.selectedZone = detail
        });
    }

    onHourChange(hour: number): void {
        this.selectedHour = hour;
    }

    onClosePanel(): void {
        this.selectedZone = null;
    }

    togglePairMode(): void {
        this.pairMode = !this.pairMode;
        this.resetPair();
    }

    toggleDensityMode(): void {
        this.densityMode = this.densityMode === 'absolute' ? 'relative' : 'absolute';
    }

    toggleTripMode(): void {
        this.tripMode = this.tripMode === 'pickup' ? 'dropoff' : 'pickup';
    }

    resetPair(): void {
        this.firstPin = null;
        this.secondPin = null;
        this.pairResult = null;
        this.pairError = false;
        this.pairLoading = false;
        this.cdr.detectChanges();
    }

    private handlePairPin(postalCode: string): void {
        if (!this.firstPin) {
            this.firstPin = postalCode;
            return;
        }

        if (this.firstPin === postalCode) return;

        this.secondPin = postalCode;
        this.pairLoading = true;

        this.zoneService.getPair(this.firstPin, this.secondPin).subscribe({
            next: (pair) => {

                this.pairResult = pair;
                this.pairLoading = false;
                this.cdr.detectChanges();
                setTimeout(() => this.togglePairMode(), 3000);

            },
            error: (err) => {

                this.pairError = true;
                this.pairLoading = false;
                this.cdr.detectChanges();
                setTimeout(() => this.togglePairMode(), 3000);

            }
        });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}