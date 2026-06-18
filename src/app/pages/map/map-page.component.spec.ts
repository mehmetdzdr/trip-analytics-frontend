import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { ZoneService } from '../../core/services/zone.service';
import { ZoneDetailDTO, ZonePairDTO, ZoneSummaryDTO } from '../../models/zone.model';
import { HourSliderComponent } from '../../components/map/hour-slider/hour-slider.component';
import { NycMapComponent } from '../../components/map/nyc-map/nyc-map.component';
import { ZonePopupComponent } from '../../components/map/zone-popup/zone-popup.component';
import { MapPageComponent } from './map-page.component';

// --- Stub child components ---
// These replace the real implementations so that Leaflet (NycMap), Chart.js (ZonePopup),
// and any other DOM-heavy code never runs during unit tests.

@Component({ selector: 'app-nyc-map', standalone: true, template: '' })
class StubNycMapComponent {
    @Input() zones: ZoneSummaryDTO[] = [];
    @Input() selectedHour = 18;
    @Input() pairMode = false;
    @Input() firstPin: string | null = null;
    @Input() densityMode = 'absolute';
    @Input() tripMode = 'pickup';
    @Output() zoneClick = new EventEmitter<string>();
}

@Component({ selector: 'app-hour-slider', standalone: true, template: '' })
class StubHourSliderComponent {
    @Input() selectedHour = 18;
    @Output() hourChange = new EventEmitter<number>();
}

@Component({ selector: 'app-zone-popup', standalone: true, template: '' })
class StubZonePopupComponent {
    @Input() zone: ZoneDetailDTO | null = null;
    @Input() selectedHour = 18;
    @Output() close = new EventEmitter<void>();
}

// --- Fixtures ---

const mockZones: ZoneSummaryDTO[] = [
    { postalCode: '10001', borough: 'Manhattan', name: 'Midtown', pickupCount: 100, dropoffCount: 80, densityPerKm2: 50, pickupsByHour: [], dropoffsByHour: [] }
];

const mockDetail: ZoneDetailDTO = {
    postalCode: '10001', borough: 'Manhattan', name: 'Midtown',
    areaKm2: 3, pickupCount: 100, dropoffCount: 80, avgFare: 14, avgDistance: 2,
    densityPerKm2: 50, daysInDataset: 31,
    pickupsByHour: new Array(24).fill(0),
    dropoffsByHour: new Array(24).fill(0)
};

const mockPair: ZonePairDTO = { pickupZip: '10001', dropoffZip: '10002', tripCount: 50, avgDuration: 12 };

describe('MapPageComponent', () => {
    let fixture: ComponentFixture<MapPageComponent>;
    let component: MapPageComponent;
    let zoneServiceMock: {
        getAll: ReturnType<typeof vi.fn>;
        getByPostalCode: ReturnType<typeof vi.fn>;
        getPair: ReturnType<typeof vi.fn>;
    };
    let authServiceMock: { logout: ReturnType<typeof vi.fn> };
    let routerMock: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        vi.useFakeTimers();

        zoneServiceMock = {
            getAll: vi.fn().mockReturnValue(of(mockZones)),
            getByPostalCode: vi.fn().mockReturnValue(of(mockDetail)),
            getPair: vi.fn().mockReturnValue(of(mockPair))
        };
        authServiceMock = { logout: vi.fn() };
        routerMock = { navigate: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [MapPageComponent],
            providers: [
                { provide: ZoneService, useValue: zoneServiceMock },
                { provide: AuthService, useValue: authServiceMock },
                { provide: Router, useValue: routerMock }
            ]
        })
            .overrideComponent(MapPageComponent, {
                remove: { imports: [NycMapComponent, HourSliderComponent, ZonePopupComponent] },
                add: { imports: [StubNycMapComponent, StubHourSliderComponent, StubZonePopupComponent] }
            })
            .compileComponents();

        fixture = TestBed.createComponent(MapPageComponent);
        component = fixture.componentInstance;
        // detectChanges() triggers ngOnInit → getAll() fires here.
        fixture.detectChanges();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    // --- ngOnInit: zone loading ---

    it('should call zoneService.getAll() on init', () => {
        expect(zoneServiceMock.getAll).toHaveBeenCalledOnce();
    });

    it('should populate zones and set loading = false after getAll() resolves', () => {
        expect(component.zones).toEqual(mockZones);
        expect(component.loading).toBe(false);
    });

    it('should set loading = false even when getAll() errors', async () => {
        zoneServiceMock.getAll.mockReturnValue(throwError(() => new Error('500')));

        // Re-create the component to trigger a fresh ngOnInit with the error mock.
        fixture = TestBed.createComponent(MapPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();

        expect(component.loading).toBe(false);
    });

    // --- Normal zone click ---

    it('should call getByPostalCode and set selectedZone on a normal zone click', () => {
        component.onZoneClick('10001');
        expect(zoneServiceMock.getByPostalCode).toHaveBeenCalledWith('10001');
        expect(component.selectedZone).toEqual(mockDetail);
    });

    // --- Hour change ---

    it('should update selectedHour when onHourChange is called', () => {
        component.onHourChange(9);
        expect(component.selectedHour).toBe(9);
    });

    // --- Close panel ---

    it('should clear selectedZone when onClosePanel is called', () => {
        component.selectedZone = mockDetail;
        component.onClosePanel();
        expect(component.selectedZone).toBeNull();
    });

    // --- Toggle modes ---

    it('should toggle densityMode between absolute and relative', () => {
        expect(component.densityMode).toBe('absolute');
        component.toggleDensityMode();
        expect(component.densityMode).toBe('relative');
        component.toggleDensityMode();
        expect(component.densityMode).toBe('absolute');
    });

    it('should toggle tripMode between pickup and dropoff', () => {
        expect(component.tripMode).toBe('pickup');
        component.toggleTripMode();
        expect(component.tripMode).toBe('dropoff');
        component.toggleTripMode();
        expect(component.tripMode).toBe('pickup');
    });

    // --- Pair mode: activation ---

    it('should set pairMode = true when togglePairMode() is called', () => {
        component.togglePairMode();
        expect(component.pairMode).toBe(true);
    });

    it('should reset all pair state when togglePairMode() is called a second time', () => {
        component.togglePairMode();
        component.firstPin = '10001';
        component.togglePairMode();

        expect(component.pairMode).toBe(false);
        expect(component.firstPin).toBeNull();
        expect(component.secondPin).toBeNull();
        expect(component.pairResult).toBeNull();
    });

    // --- Pair mode: first click sets firstPin ---

    it('should set firstPin on the first zone click in pair mode', () => {
        component.togglePairMode();
        component.onZoneClick('10001');

        expect(component.firstPin).toBe('10001');
        // getPair must NOT be called yet — we only have one pin.
        expect(zoneServiceMock.getPair).not.toHaveBeenCalled();
    });

    // --- Pair mode: clicking the same zone twice does nothing ---

    it('should ignore a second click on the same zone as firstPin', () => {
        component.togglePairMode();
        component.onZoneClick('10001');
        component.onZoneClick('10001'); // same zone

        expect(zoneServiceMock.getPair).not.toHaveBeenCalled();
        expect(component.secondPin).toBeNull();
    });

    // --- Pair mode: successful pair ---

    it('should call getPair and populate pairResult on two distinct zone clicks', () => {
        component.togglePairMode();
        component.onZoneClick('10001');
        component.onZoneClick('10002');

        expect(zoneServiceMock.getPair).toHaveBeenCalledWith('10001', '10002');
        expect(component.pairResult).toEqual(mockPair);
        expect(component.pairLoading).toBe(false);
    });

    it('should auto-reset pair mode 3 seconds after a successful pair result', () => {
        component.togglePairMode();
        component.onZoneClick('10001');
        component.onZoneClick('10002');

        expect(component.pairMode).toBe(true); // still active before timeout

        vi.advanceTimersByTime(3000);

        expect(component.pairMode).toBe(false);
    });

    // --- Pair mode: failed pair ---

    it('should set pairError = true and pairLoading = false when getPair errors', () => {
        zoneServiceMock.getPair.mockReturnValue(throwError(() => new Error('404')));

        component.togglePairMode();
        component.onZoneClick('10001');
        component.onZoneClick('10002');

        expect(component.pairError).toBe(true);
        expect(component.pairLoading).toBe(false);
    });

    it('should auto-reset pair mode 3 seconds after a failed pair result', () => {
        zoneServiceMock.getPair.mockReturnValue(throwError(() => new Error('404')));

        component.togglePairMode();
        component.onZoneClick('10001');
        component.onZoneClick('10002');

        vi.advanceTimersByTime(3000);

        expect(component.pairMode).toBe(false);
    });

    // --- In pair mode, normal zone clicks go to pair handler, not getByPostalCode ---

    it('should NOT call getByPostalCode when clicking a zone in pair mode', () => {
        component.togglePairMode();
        component.onZoneClick('10001');

        expect(zoneServiceMock.getByPostalCode).not.toHaveBeenCalled();
    });

    // --- Logout ---

    it('should call authService.logout() and navigate to /login on logout()', () => {
        component.logout();
        expect(authServiceMock.logout).toHaveBeenCalledOnce();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
});
