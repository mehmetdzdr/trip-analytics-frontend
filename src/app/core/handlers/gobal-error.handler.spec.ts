import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalErrorHandler } from './global-error.handler';

describe('GlobalErrorHandler', () => {
    let handler: GlobalErrorHandler;
    let snackBarMock: { open: ReturnType<typeof vi.fn> };
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        snackBarMock = { open: vi.fn() };

        TestBed.configureTestingModule({
            providers: [
                GlobalErrorHandler,
                { provide: MatSnackBar, useValue: snackBarMock }
                // NgZone burada provide edilmiyor — gerçek NgZone kullanılıyor,
                // çünkü zone.run() davranışını gerçekten test etmek istiyoruz.
            ]
        });

        handler = TestBed.inject(GlobalErrorHandler);
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    it('should log the error to the console', () => {
        const testError = new Error('Something broke');

        handler.handleError(testError);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Global error:', testError);
    });

    it('should open a snackbar with the correct message and options', () => {
        const testError = new Error('Something broke');

        handler.handleError(testError);

        expect(snackBarMock.open).toHaveBeenCalledWith(
            'An unexpected error occurred.',
            'Close',
            {
                duration: 4000,
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
            }
        );
    });

    it('should handle non-Error values (e.g. strings or unknown objects) without throwing', () => {
        expect(() => handler.handleError('a raw string error')).not.toThrow();
        expect(() => handler.handleError({ weird: 'object' })).not.toThrow();
        expect(snackBarMock.open).toHaveBeenCalledTimes(2);
    });

    it('should run the snackbar call inside NgZone', () => {
        const zone = TestBed.inject(NgZone);
        const runSpy = vi.spyOn(zone, 'run');

        handler.handleError(new Error('zone test'));

        expect(runSpy).toHaveBeenCalled();
    });
});