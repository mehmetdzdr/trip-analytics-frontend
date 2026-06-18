import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoadingService } from '../../../core/services/loading.service';
import { LoadingComponent } from './loading.component';

describe('LoadingComponent', () => {
    let fixture: ComponentFixture<LoadingComponent>;
    let loadingService: LoadingService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LoadingComponent],
            providers: [
                // LoadingService is providedIn: 'root' — TestBed provides it automatically.
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LoadingComponent);
        loadingService = TestBed.inject(LoadingService);
        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    // --- Initial state ---

    it('should NOT render the progress bar when loading is false', () => {
        // LoadingService starts with isLoading$ = false (BehaviorSubject initial value).
        const bar = fixture.nativeElement.querySelector('mat-progress-bar');
        expect(bar).toBeNull();
    });

    // --- Loading starts ---

    it('should render the progress bar when loading becomes true', () => {
        loadingService.show();
        // detectChanges() processes the async pipe subscription and updates the template.
        fixture.detectChanges();

        const bar = fixture.nativeElement.querySelector('mat-progress-bar');
        expect(bar).toBeTruthy();
    });

    // --- Loading ends ---

    it('should remove the progress bar when loading returns to false', () => {
        loadingService.show();
        fixture.detectChanges();

        loadingService.hide();
        fixture.detectChanges();

        const bar = fixture.nativeElement.querySelector('mat-progress-bar');
        expect(bar).toBeNull();
    });

    // --- Multiple concurrent requests (counter pattern) ---

    it('should keep the progress bar visible until all concurrent requests finish', () => {
        // Two requests start → service counter = 2.
        loadingService.show();
        loadingService.show();
        fixture.detectChanges();

        // First request finishes → counter = 1.  Still loading.
        loadingService.hide();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeTruthy();

        // Second request finishes → counter = 0.  Done.
        loadingService.hide();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('mat-progress-bar')).toBeNull();
    });
});
