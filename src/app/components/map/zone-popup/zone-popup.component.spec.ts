import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HourlyChartComponent } from '../../statistics/hourly-chart/hourly-chart.component';
import { ZoneDetailDTO } from '../../../models/zone.model';
import { ZonePopupComponent } from './zone-popup.component';

// HourlyChartComponent initialises a Chart.js canvas in ngAfterViewInit.
// jsdom has no real canvas context, so we replace it with a no-op stub.
@Component({ selector: 'app-hourly-chart', standalone: true, template: '' })
class StubHourlyChartComponent {
    @Input() pickupsByHour: number[] = [];
    @Input() dropoffsByHour: number[] = [];
    @Input() selectedHour = 18;
    @Input() daysInDataset = 31;
}

// Builds a minimal ZoneDetailDTO with predictable values for math assertions.
function makeZone(overrides: Partial<ZoneDetailDTO> = {}): ZoneDetailDTO {
    return {
        postalCode: '10001',
        borough: 'Manhattan',
        name: 'Midtown',
        areaKm2: 3.5,
        pickupCount: 3100,   // 100/day over 31 days
        dropoffCount: 2480,  // 80/day
        avgFare: 14.5,
        avgDistance: 2.3,
        densityPerKm2: 886,
        daysInDataset: 31,
        // 24-hour arrays.  Hour 18 has 310 pickups and 248 dropoffs total.
        pickupsByHour: Array.from({ length: 24 }, (_, i) => (i === 18 ? 310 : 0)),
        dropoffsByHour: Array.from({ length: 24 }, (_, i) => (i === 18 ? 248 : 0)),
        ...overrides
    };
}

describe('ZonePopupComponent', () => {
    let fixture: ComponentFixture<ZonePopupComponent>;
    let component: ZonePopupComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ZonePopupComponent]
        })
            // Swap out real HourlyChart for the stub so Chart.js is never touched.
            .overrideComponent(ZonePopupComponent, {
                remove: { imports: [HourlyChartComponent] },
                add: { imports: [StubHourlyChartComponent] }
            })
            .compileComponents();

        fixture = TestBed.createComponent(ZonePopupComponent);
        component = fixture.componentInstance;
    });

    // --- Basic rendering ---

    it('should create the component', () => {
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should render the zone name, borough, and postal code', () => {
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.textContent).toContain('Midtown');
        expect(el.textContent).toContain('Manhattan');
        expect(el.textContent).toContain('10001');
    });

    // --- ngOnChanges math ---
    // These three calculations all live in ngOnChanges and are the core logic of the component.
    //
    // Critical: we MUST use fixture.componentRef.setInput() here instead of direct
    // property assignment.  Angular only calls ngOnChanges when it pushes a value
    // through its own @Input() mechanism.  Direct assignment (component.zone = ...)
    // bypasses that entirely and ngOnChanges never fires, leaving the derived values
    // at their initial 0.

    it('should compute pickupsAtHour = round(pickupsByHour[h] / daysInDataset)', () => {
        // 310 pickups at hour 18 across 31 days = 10/day exactly.
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        // setInput() triggers ngOnChanges synchronously — no detectChanges needed
        // for the property assertion, but we call it to keep the pattern consistent.
        fixture.detectChanges();

        expect(component.pickupsAtHour).toBe(10);
    });

    it('should compute dropoffsAtHour = round(dropoffsByHour[h] / daysInDataset)', () => {
        // 248 dropoffs at hour 18 across 31 days = 8/day exactly.
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();

        expect(component.dropoffsAtHour).toBe(8);
    });

    it('should compute avgPickupsPerDay = round(pickupCount / daysInDataset)', () => {
        // 3100 total pickups / 31 days = 100/day exactly.
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();

        expect(component.avgPickupsPerDay).toBe(100);
    });

    it('should round fractional averages to the nearest integer', () => {
        // 100 pickups at one hour, 31 days → 100/31 ≈ 3.226 → rounds to 3.
        const zone = makeZone({
            pickupsByHour: Array.from({ length: 24 }, (_, i) => (i === 5 ? 100 : 0))
        });
        fixture.componentRef.setInput('zone', zone);
        fixture.componentRef.setInput('selectedHour', 5);
        fixture.detectChanges();

        expect(component.pickupsAtHour).toBe(3);
    });

    // --- Recalculation on input change ---

    it('should recalculate derived values when selectedHour input changes', () => {
        // Hour 18 has 310 pickups, hour 0 has 0.
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();
        expect(component.pickupsAtHour).toBe(10);

        // setInput() queues the change — detectChanges() is still required to run the
        // CD cycle that actually calls ngOnChanges with the new value.
        fixture.componentRef.setInput('selectedHour', 0);
        fixture.detectChanges();

        expect(component.pickupsAtHour).toBe(0);
    });

    it('should recalculate when the zone input itself changes', () => {
        fixture.componentRef.setInput('zone', makeZone({ pickupsByHour: Array.from({ length: 24 }, (_, i) => (i === 18 ? 620 : 0)) }));
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();

        // 620 / 31 = 20
        expect(component.pickupsAtHour).toBe(20);
    });

    // --- formattedHour edge cases ---
    // The formula `h % 12 === 0 ? 12 : h % 12` must produce 12 for both 0 and 12,
    // but the AM/PM suffix distinguishes them.

    it('should return "12:00 AM" for hour 0', () => {
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 0);
        fixture.detectChanges();
        expect(component.formattedHour).toBe('12:00 AM');
    });

    it('should return "12:00 PM" for hour 12', () => {
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 12);
        fixture.detectChanges();
        expect(component.formattedHour).toBe('12:00 PM');
    });

    it('should return "6:00 PM" for hour 18', () => {
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();
        expect(component.formattedHour).toBe('6:00 PM');
    });

    // --- Close event ---

    it('should emit close when the close button is clicked', () => {
        fixture.componentRef.setInput('zone', makeZone());
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();

        const closeSpy = vi.fn();
        component.close.subscribe(closeSpy);

        const closeBtn = fixture.nativeElement.querySelector('button.close-btn') as HTMLButtonElement;
        closeBtn.click();

        expect(closeSpy).toHaveBeenCalledOnce();
    });
});
