import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);
    const snackBar = inject(MatSnackBar);
    const authService = inject(AuthService);
    const isAuthRequest = req.url.includes('/api/auth/');

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {

            if (error.status === 401 && !isAuthRequest) {
                authService.logout();
                router.navigate(['/login']);
                snackBar.open('Session expired. Please login again.', 'Close', {
                    duration: 3000,
                    verticalPosition: 'top',
                    panelClass: ['error-snackbar']
                });
            } else if (error.status === 500) {
                snackBar.open('Server error. Please try again later.', 'Close', {
                    duration: 3000,
                    verticalPosition: 'top',
                    panelClass: ['error-snackbar']
                });
            } else if (error.status === 0) {
                snackBar.open('Connection error. Please check your network.', 'Close', {
                    duration: 3000,
                    verticalPosition: 'top',
                    panelClass: ['error-snackbar']
                });
            }

            return throwError(() => error);
        })
    );
};