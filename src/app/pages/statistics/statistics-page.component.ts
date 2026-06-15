import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { HourlyChartComponent } from '../../components/statistics/hourly-chart/hourly-chart.component';
import { AuthService } from '../../core/services/auth.service';
import { ZoneService } from '../../core/services/zone.service';
import { ZoneDetailDTO, ZoneSummaryDTO } from '../../models/zone.model';

@Component({
    selector: 'app-statistics-page',
    standalone: true,
    imports: [
        CommonModule,
        HourlyChartComponent,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatInputModule,
        MatFormFieldModule,
        MatProgressSpinnerModule,
        MatChipsModule,
        MatButtonModule,
        MatIconModule
    ],
    templateUrl: './statistics-page.component.html',
    styleUrl: './statistics-page.component.scss'
})
export class StatisticsPageComponent implements OnInit, AfterViewInit {

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    displayedColumns = ['postalCode', 'name', 'borough', 'pickupCount', 'dropoffCount', 'densityPerKm2'];

    zones: ZoneSummaryDTO[] = [];
    totalItemCount = 0;
    selectedZone: ZoneDetailDTO | null = null;
    selectedHour = 18;
    loading = false;

    page = 1;
    pageSize = 20;
    sortBy = 'pickupCount';
    sortOrder = 'desc';
    selectedBorough = 'All';
    searchQuery = '';

    boroughs = ['All', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

    //private searchSubject = new Subject<string>();

    constructor(
        private zoneService: ZoneService,
        private authService: AuthService,
        public router: Router,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    ngAfterViewInit(): void { }

    loadData(): void {
        const timer = setTimeout(() => this.loading = true, 200);

        this.zoneService.getPaged(
            this.page,
            this.pageSize,
            this.sortBy,
            this.sortOrder,
            this.selectedBorough,
            this.searchQuery
        ).subscribe({
            next: (result) => {
                clearTimeout(timer);
                this.zones = result.items;
                this.totalItemCount = result.totalItemCount;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error: () => {
                this.loading = false;
                clearTimeout(timer);
                this.cdr.detectChanges();
            }
        });
    }

    onSortChange(sort: Sort): void {
        this.sortBy = sort.active;
        this.sortOrder = sort.direction || 'desc';
        this.page = 1;
        this.loadData();
    }

    onPageChange(event: PageEvent): void {
        this.page = event.pageIndex + 1;
        this.pageSize = event.pageSize;
        this.loadData();
    }

    onBoroughChange(borough: string): void {
        console.log('borough changed:', borough, 'current:', this.selectedBorough);
        this.selectedBorough = borough;
        this.page = 1;
        this.loadData();
    }

    onSearchInput(event: Event): void {
        this.searchQuery = (event.target as HTMLInputElement).value;
    }

    onSearchSubmit(): void {
        this.page = 1;
        this.loadData();
    }

    onRowClick(postalCode: string): void {
        this.zoneService.getByPostalCode(postalCode).subscribe({
            next: (detail) => this.selectedZone = detail
        });
    }

    logout(): void {
        this.authService.logout();
        this.router.navigate(['/login']);
    }
}