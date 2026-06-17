import { HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
    let authServiceMock: { getToken: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        authServiceMock = {
            getToken: vi.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceMock }
            ]
        });
    });

    function runInterceptor(req: HttpRequest<unknown>) {
        let capturedRequest!: HttpRequest<unknown>;
        const next: HttpHandlerFn = (interceptedReq) => {
            capturedRequest = interceptedReq;
            return of({} as any);
        };

        TestBed.runInInjectionContext(() => {
            authInterceptor(req, next);
        });

        return capturedRequest;
    }

    it('should add an Authorization header when a token exists', () => {
        authServiceMock.getToken.mockReturnValue('fake-jwt-token');

        const originalReq = new HttpRequest('GET', '/api/zones');
        const result = runInterceptor(originalReq);

        expect(result.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    });

    it('should not add an Authorization header when no token exists', () => {
        authServiceMock.getToken.mockReturnValue(null);

        const originalReq = new HttpRequest('GET', '/api/zones');
        const result = runInterceptor(originalReq);

        expect(result.headers.has('Authorization')).toBe(false);
    });

    it('should preserve the original request URL and method when adding the header', () => {
        authServiceMock.getToken.mockReturnValue('fake-jwt-token');

        const originalReq = new HttpRequest('POST', '/api/auth/login', { username: 'mehmet' });
        const result = runInterceptor(originalReq);

        expect(result.url).toBe('/api/auth/login');
        expect(result.method).toBe('POST');
        expect(result.body).toEqual({ username: 'mehmet' });
    });
});