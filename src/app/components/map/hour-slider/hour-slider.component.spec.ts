import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HourSliderComponent } from './hour-slider.component';

describe('HourSliderComponent', () => {
    let fixture: ComponentFixture<HourSliderComponent>;
    let component: HourSliderComponent;

    beforeEach(async () => {
        // No mocks needed — this component has zero external dependencies.
        await TestBed.configureTestingModule({
            imports: [HourSliderComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(HourSliderComponent);
        component = fixture.componentInstance;
        // No detectChanges() here — each test manages its own initial render.
        // Calling it here then mutating @Input in a test causes NG0100, because
        // Angular's dev-mode second-pass check sees the binding changed after the
        // previous cycle already confirmed it.
    });

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    // --- Boundary: back arrow at hour 0 ---

    it('should disable the back arrow when selectedHour is 0', () => {
        // setInput() goes through Angular's @Input() pipeline, so detectChanges()
        // sees the change as expected — no NG0100.
        fixture.componentRef.setInput('selectedHour', 0);
        fixture.detectChanges();
        const backBtn = fixture.nativeElement.querySelector('button.arrow:first-of-type') as HTMLButtonElement;
        expect(backBtn.disabled).toBe(true);
    });

    it('should enable the back arrow when selectedHour is greater than 0', () => {
        fixture.componentRef.setInput('selectedHour', 5);
        fixture.detectChanges();
        const backBtn = fixture.nativeElement.querySelector('button.arrow:first-of-type') as HTMLButtonElement;
        expect(backBtn.disabled).toBe(false);
    });

    // --- Boundary: forward arrow at hour 23 ---

    it('should disable the forward arrow when selectedHour is 23', () => {
        fixture.componentRef.setInput('selectedHour', 23);
        fixture.detectChanges();
        const nextBtn = fixture.nativeElement.querySelector('button.arrow:last-of-type') as HTMLButtonElement;
        expect(nextBtn.disabled).toBe(true);
    });

    it('should enable the forward arrow when selectedHour is less than 23', () => {
        fixture.componentRef.setInput('selectedHour', 18);
        fixture.detectChanges();
        const nextBtn = fixture.nativeElement.querySelector('button.arrow:last-of-type') as HTMLButtonElement;
        expect(nextBtn.disabled).toBe(false);
    });

    // --- prev() emission ---

    it('should emit selectedHour - 1 when prev() is called', () => {
        component.selectedHour = 10;
        const emitted: number[] = [];
        component.hourChange.subscribe(v => emitted.push(v));

        component.prev();

        expect(emitted).toEqual([9]);
    });

    it('should NOT emit when prev() is called at hour 0', () => {
        // The method guard `if (selectedHour > 0)` must protect the emit.
        // Even if the button is somehow enabled by external input, the method is safe.
        component.selectedHour = 0;
        const emitted: number[] = [];
        component.hourChange.subscribe(v => emitted.push(v));

        component.prev();

        expect(emitted).toEqual([]);
    });

    // --- next() emission ---

    it('should emit selectedHour + 1 when next() is called', () => {
        component.selectedHour = 10;
        const emitted: number[] = [];
        component.hourChange.subscribe(v => emitted.push(v));

        component.next();

        expect(emitted).toEqual([11]);
    });

    it('should NOT emit when next() is called at hour 23', () => {
        component.selectedHour = 23;
        const emitted: number[] = [];
        component.hourChange.subscribe(v => emitted.push(v));

        component.next();

        expect(emitted).toEqual([]);
    });

    // --- Slider input event ---

    it('should emit the numeric value from the range input when dragged', () => {
        const emitted: number[] = [];
        component.hourChange.subscribe(v => emitted.push(v));

        // Simulate the native (input) event the range slider fires.
        const slider = fixture.nativeElement.querySelector('input[type="range"]') as HTMLInputElement;
        slider.value = '14';
        slider.dispatchEvent(new Event('input'));

        expect(emitted).toEqual([14]);
    });

    // --- formattedHour getter: 12-hour clock edge cases ---
    // The formula is: `h % 12 === 0 ? 12 : h % 12`, so 0 and 12 both evaluate
    // to 0 % 12 and 12 % 12 respectively — both are 0, but one must show 12 AM,
    // the other 12 PM.

    it('should display "12:00 AM" for hour 0 (midnight)', () => {
        component.selectedHour = 0;
        expect(component.formattedHour).toBe('12:00 AM');
    });

    it('should display "12:00 PM" for hour 12 (noon)', () => {
        component.selectedHour = 12;
        expect(component.formattedHour).toBe('12:00 PM');
    });

    it('should display "6:00 PM" for hour 18', () => {
        component.selectedHour = 18;
        expect(component.formattedHour).toBe('6:00 PM');
    });

    it('should display "1:00 AM" for hour 1', () => {
        component.selectedHour = 1;
        expect(component.formattedHour).toBe('1:00 AM');
    });

    it('should display "11:00 PM" for hour 23', () => {
        component.selectedHour = 23;
        expect(component.formattedHour).toBe('11:00 PM');
    });

    // --- Template display ---

    it('should update the displayed hour label in the DOM when selectedHour changes', () => {
        fixture.componentRef.setInput('selectedHour', 9);
        fixture.detectChanges();
        const display = fixture.nativeElement.querySelector('.hour-display') as HTMLElement;
        expect(display.textContent?.trim()).toBe('9:00 AM');
    });
});
