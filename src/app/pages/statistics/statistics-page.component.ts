import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HourlyChartComponent } from '../../components/statistics/hourly-chart/hourly-chart.component';
import { AuthService } from '../../core/services/auth.service';
import { ZoneService } from '../../core/services/zone.service';
import { ZoneDetailDTO, ZoneSummaryDTO } from '../../models/zone.model';

type SortKey = 'pickupCount' | 'dropoffCount' | 'avgFare' | 'avgDistance' | 'densityPerKm2';
type SortDir = 'asc' | 'desc';

@Component({
    selector: 'app-statistics-page',
    standalone: true,
    imports: [CommonModule, HourlyChartComponent],
    templateUrl: './statistics-page.component.html',
    styleUrl: './statistics-page.component.scss'
})
export class StatisticsPageComponent implements OnInit {

    zones: ZoneSummaryDTO[] = [];
    filteredZones: ZoneSummaryDTO[] = [];
    selectedZone: ZoneDetailDTO | null = null;
    selectedHour = 18;
    loading = true;

    sortKey: SortKey = 'pickupCount';
    sortDir: SortDir = 'desc';

    boroughs = ['All', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
    selectedBorough = 'All';

    searchQuery = '';

    constructor(
        private zoneService: ZoneService,
        private authService: AuthService,
        public router: Router
    ) { }

    ngOnInit(): void {
        this.zoneService.getAll().subscribe({
            next: (data) => {
                this.zones = data;
                this.applyFilters();
                this.loading = false;
            }
        });
    }

    applyFilters(): void {
        let result = [...this.zones];

        if (this.selectedBorough !== 'All') {
            result = result.filter(z => z.borough === this.selectedBorough);
        }

        if (this.searchQuery.trim()) {
            const q = this.searchQuery.toLowerCase();
            result = result.filter(z =>
                z.postalCode.includes(q) || z.name.toLowerCase().includes(q)
            );
        }

        result.sort((a, b) => {
            const aVal = a[this.sortKey as keyof ZoneSummaryDTO] as number;
            const bVal = b[this.sortKey as keyof ZoneSummaryDTO] as number;
            return this.sortDir === 'desc' ? bVal - aVal : aVal - bVal;
        });

        this.filteredZones = result;
    }

    onSort(key: SortKey): void {
        if (this.sortKey === key) {
            this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
        } else {
            this.sortKey = key;
            this.sortDir = 'desc';
        }
        this.applyFilters();
    }

    onBoroughChange(borough: string): void {
        this.selectedBorough = borough;
        this.applyFilters();
    }

    onSearch(event: Event): void {
        this.searchQuery = (event.target as HTMLInputElement).value;
        this.applyFilters();
    }

    onRowClick(postalCode: string): void {
        this.zoneService.getByPostalCode(postalCode).subscribe({
            next: (detail) => this.selectedZone = detail
        });
    }

    sortIcon(key: SortKey): string {
        if (this.sortKey !== key) return '↕';
        return this.sortDir === 'desc' ? '↓' : '↑';
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}