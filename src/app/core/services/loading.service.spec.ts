import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
    let service: LoadingService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(LoadingService);
    });

    function currentValue(): Promise<boolean> {
        return firstValueFrom(service.isLoading$);
    }

    it('should start with isLoading$ as false', async () => {
        expect(await currentValue()).toBe(false);
    });

    it('should emit true when show() is called', async () => {
        service.show();
        expect(await currentValue()).toBe(true);
    });

    it('should emit false when show() is followed by hide()', async () => {
        service.show();
        service.hide();
        expect(await currentValue()).toBe(false);
    });

    it('should remain true after one hide() when show() was called twice (reference counting)', async () => {
        service.show();
        service.show();
        service.hide();

        expect(await currentValue()).toBe(true);
    });

    it('should become false only after hide() is called as many times as show()', async () => {
        service.show();
        service.show();
        service.hide();
        service.hide();

        expect(await currentValue()).toBe(false);
    });

    it('should not go negative or throw when hide() is called without a matching show()', async () => {
        expect(() => service.hide()).not.toThrow();
        expect(await currentValue()).toBe(false);
    });

    it('should stay false if hide() is called more times than show()', async () => {
        service.show();
        service.hide();
        service.hide();
        service.hide();

        expect(await currentValue()).toBe(false);
    });

    it('should emit the correct sequence of values for a realistic show/show/hide/hide flow', () => {
        const emissions: boolean[] = [];
        const subscription = service.isLoading$.subscribe(value => emissions.push(value));

        service.show();  // true
        service.show();  // true (still loading, but BehaviorSubject re-emits true)
        service.hide();  // true (one request still pending)
        service.hide();  // false (all requests done)
        service.show();  // true (new request starts)

        subscription.unsubscribe();

        expect(emissions).toEqual([false, true, true, false, true]);
    });
});