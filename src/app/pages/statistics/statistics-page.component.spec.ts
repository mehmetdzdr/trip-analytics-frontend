import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ZoneService } from '../../core/services/zone.service';
import { HourlyChartComponent } from '../../components/statistics/hourly-chart/hourly-chart.component';
import { PagedResult, ZoneDetailDTO, ZoneSummaryDTO } from '../../models/zone.model';
import { StatisticsPageComponent } from './statistics-page.component';

// Stub to prevent Chart.js canvas initialisation in jsdom.
@Component({ selector: 'app-hourly-chart', standalone: true, template: '' })
class StubHourlyChartComponent {
    @Input() pickupsByHour: number[] = [];
    @Input() dropoffsByHour: number[] = [];
    @Input() selectedHour = 18;
    @Input() daysInDataset = 31;
}

// --- Fixtures ---

function makeZoneSummary(postalCode: string): ZoneSummaryDTO {
    return { postalCode, borough: 'Manhattan', name: 'Zone ' + postalCode, pickupCount: 100, dropoffCount: 80, densityPerKm2: 50, pickupsByHour: [], dropoffsByHour: [] };
}

function makeDetail(postalCode: string): ZoneDetailDTO {
    return {
        postalCode, borough: 'Manhattan', name: 'Zone ' + postalCode,
        areaKm2: 3, pickupCount: 100, dropoffCount: 80, avgFare: 14, avgDistance: 2,
        densityPerKm2: 50, daysInDataset: 31,
        pickupsByHour: new Array(24).fill(0),
        dropoffsByHour: new Array(24).fill(0)
    };
}

function makePagedResult(items: ZoneSummaryDTO[], total = 100): PagedResult<ZoneSummaryDTO> {
    return { items, totalItemCount: total, page: 1, pageSize: 20, totalPages: 5 };
}

describe('StatisticsPageComponent', () => {
    let fixture: ComponentFixture<StatisticsPageComponent>;
    let component: StatisticsPageComponent;
    let zoneServiceMock: {
        getPaged: ReturnType<typeof vi.fn>;
        getByPostalCode: ReturnType<typeof vi.fn>;
    };
    let authServiceMock: { logout: ReturnType<typeof vi.fn> };
    let routerMock: { navigate: ReturnType<typeof vi.fn> };

    const defaultItems = [makeZoneSummary('10001'), makeZoneSummary('10002')];

    beforeEach(async () => {
        zoneServiceMock = {
            getPaged: vi.fn().mockReturnValue(of(makePagedResult(defaultItems))),
            getByPostalCode: vi.fn().mockReturnValue(of(makeDetail('10001')))
        };
        authServiceMock = { logout: vi.fn() };
        routerMock = { navigate: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [StatisticsPageComponent],
            providers: [
                { provide: ZoneService, useValue: zoneServiceMock },
                { provide: AuthService, useValue: authServiceMock },
                { provide: Router, useValue: routerMock }
            ]
        })
            .overrideComponent(StatisticsPageComponent, {
                remove: { imports: [HourlyChartComponent] },
                add: { imports: [StubHourlyChartComponent] }
            })
            .compileComponents();

        fixture = TestBed.createComponent(StatisticsPageComponent);
        component = fixture.componentInstance;
        // ngOnInit fires here → calls loadData() → calls getPaged() once.
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    // --- ngOnInit: initial data load ---

    it('should call getPaged on init with default parameters', () => {
        // Defaults: page=1, pageSize=20, sortBy='pickupCount', sortOrder='desc', no borough or search.
        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(1, 20, 'pickupCount', 'desc', 'All', '');
    });

    it('should populate zones and totalItemCount after init', () => {
        expect(component.zones).toEqual(defaultItems);
        expect(component.totalItemCount).toBe(100);
    });

    it('should set loading = false after data loads', () => {
        expect(component.loading).toBe(false);
    });

    it('should set loading = false even when getPaged errors', () => {
        zoneServiceMock.getPaged.mockReturnValue(throwError(() => new Error('500')));

        fixture = TestBed.createComponent(StatisticsPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.loading).toBe(false);
    });

    // --- Sort change ---

    it('should update sortBy and sortOrder and reload from page 1 on sort change', () => {
        zoneServiceMock.getPaged.mockClear();

        component.onSortChange({ active: 'name', direction: 'asc' });

        expect(component.sortBy).toBe('name');
        expect(component.sortOrder).toBe('asc');
        expect(component.page).toBe(1);
        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(1, 20, 'name', 'asc', 'All', '');
    });

    it('should default sortOrder to "desc" when direction is empty string', () => {
        // When the user clicks a sorted column a third time, MatSort clears the direction.
        // The component has `sort.direction || 'desc'` to handle this.
        component.onSortChange({ active: 'pickupCount', direction: '' });
        expect(component.sortOrder).toBe('desc');
    });

    // --- Page change ---

    it('should update page and pageSize and reload on page change', () => {
        zoneServiceMock.getPaged.mockClear();

        // MatPaginator uses 0-based pageIndex; the component converts to 1-based page.
        component.onPageChange({ pageIndex: 1, pageSize: 10, length: 100 });

        expect(component.page).toBe(2);
        expect(component.pageSize).toBe(10);
        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(2, 10, 'pickupCount', 'desc', 'All', '');
    });

    it('should use page = pageIndex + 1 (0-based to 1-based conversion)', () => {
        component.onPageChange({ pageIndex: 0, pageSize: 20, length: 100 });
        expect(component.page).toBe(1);

        component.onPageChange({ pageIndex: 4, pageSize: 20, length: 100 });
        expect(component.page).toBe(5);
    });

    // --- Borough filter ---

    it('should update selectedBorough, reset page to 1, and reload on borough change', () => {
        zoneServiceMock.getPaged.mockClear();
        component.page = 3; // simulate being on page 3

        component.onBoroughChange('Brooklyn');

        expect(component.selectedBorough).toBe('Brooklyn');
        expect(component.page).toBe(1);
        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(1, 20, 'pickupCount', 'desc', 'Brooklyn', '');
    });

    it('should pass the borough to getPaged as-is (including "All")', () => {
        zoneServiceMock.getPaged.mockClear();
        component.onBoroughChange('All');
        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(1, 20, 'pickupCount', 'desc', 'All', '');
    });

    // --- Search ---

    it('should update searchQuery from the input event', () => {
        const inputEvent = { target: { value: 'mid' } } as unknown as Event;
        component.onSearchInput(inputEvent);
        expect(component.searchQuery).toBe('mid');
    });

    it('should reset page to 1 and reload with the search query on submit', () => {
        zoneServiceMock.getPaged.mockClear();
        component.searchQuery = 'midtown';
        component.page = 2;

        component.onSearchSubmit();

        expect(component.page).toBe(1);
        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(1, 20, 'pickupCount', 'desc', 'All', 'midtown');
    });

    // --- Row click: detail load ---

    it('should call getByPostalCode and set selectedZone when a row is clicked', () => {
        component.onRowClick('10001');

        expect(zoneServiceMock.getByPostalCode).toHaveBeenCalledWith('10001');
        expect(component.selectedZone).toEqual(makeDetail('10001'));
    });

    it('should replace the previously selected zone when a different row is clicked', () => {
        zoneServiceMock.getByPostalCode.mockReturnValue(of(makeDetail('10002')));

        component.onRowClick('10002');

        expect(component.selectedZone?.postalCode).toBe('10002');
    });

    // --- Combined: sort after borough filter retains the filter ---

    it('should retain borough filter when sorting', () => {
        component.onBoroughChange('Queens');
        zoneServiceMock.getPaged.mockClear();

        component.onSortChange({ active: 'dropoffCount', direction: 'asc' });

        expect(zoneServiceMock.getPaged).toHaveBeenCalledWith(1, 20, 'dropoffCount', 'asc', 'Queens', '');
    });

    // --- Logout ---

    it('should call authService.logout() and navigate to /login on logout()', () => {
        component.logout();
        expect(authServiceMock.logout).toHaveBeenCalledOnce();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
});
