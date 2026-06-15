import { ErrorHandler, inject, Injectable, NgZone } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
    private snackBar = inject(MatSnackBar);
    private zone = inject(NgZone);

    handleError(error: unknown): void {
        console.error('Global error:', error);

        this.zone.run(() => {
            this.snackBar.open('An unexpected error occurred.', 'Close', {
                duration: 4000,
                verticalPosition: 'top',
                panelClass: ['error-snackbar']
            });
        });
    }
}