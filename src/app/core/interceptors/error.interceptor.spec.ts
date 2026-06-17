import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { firstValueFrom, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
    let authServiceMock: { logout: ReturnType<typeof vi.fn> };
    let routerMock: { navigate: ReturnType<typeof vi.fn> };
    let snackBarMock: { open: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        authServiceMock = { logout: vi.fn() };
        routerMock = { navigate: vi.fn() };
        snackBarMock = { open: vi.fn() };

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: MatSnackBar, useValue: snackBarMock }
            ]
        });
    });

    function runInterceptor(req: HttpRequest<unknown>, errorStatus: number) {
        const mockError = new HttpErrorResponse({ status: errorStatus });
        const next: HttpHandlerFn = () => throwError(() => mockError);

        return TestBed.runInInjectionContext(() =>
            firstValueFrom(errorInterceptor(req, next).pipe()).catch(err => err)
        );
    }

    it('should logout, navigate to login, and show a snackbar on 401 for a non-auth request', async () => {
        const req = new HttpRequest('GET', '/api/zones');

        const error = await runInterceptor(req, 401);

        expect(authServiceMock.logout).toHaveBeenCalledOnce();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
        expect(snackBarMock.open).toHaveBeenCalledWith(
            'Session expired. Please login again.',
            'Close',
            expect.objectContaining({ panelClass: ['error-snackbar'] })
        );
        expect(error.status).toBe(401);
    });

    it('should NOT logout or navigate on 401 for an auth request (e.g. failed login)', async () => {
        const req = new HttpRequest('POST', '/api/auth/login', { username: 'mehmet', password: 'wrong' });

        const error = await runInterceptor(req, 401);

        expect(authServiceMock.logout).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(snackBarMock.open).not.toHaveBeenCalled();
        expect(error.status).toBe(401);
    });

    it('should show a server error snackbar on 500', async () => {
        const req = new HttpRequest('GET', '/api/zones');

        const error = await runInterceptor(req, 500);

        expect(snackBarMock.open).toHaveBeenCalledWith(
            'Server error. Please try again later.',
            'Close',
            expect.objectContaining({ panelClass: ['error-snackbar'] })
        );
        expect(authServiceMock.logout).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(error.status).toBe(500);
    });

    it('should show a connection error snackbar on status 0 (network error)', async () => {
        const req = new HttpRequest('GET', '/api/zones');

        const error = await runInterceptor(req, 0);

        expect(snackBarMock.open).toHaveBeenCalledWith(
            'Connection error. Please check your network.',
            'Close',
            expect.objectContaining({ panelClass: ['error-snackbar'] })
        );
        expect(error.status).toBe(0);
    });

    it('should not trigger any side effects for other status codes (e.g. 404)', async () => {
        const req = new HttpRequest('GET', '/api/zones/99999');

        const error = await runInterceptor(req, 404);

        expect(authServiceMock.logout).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
        expect(snackBarMock.open).not.toHaveBeenCalled();
        expect(error.status).toBe(404);
    });
});