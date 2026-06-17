import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest } from '../../models/auth.model';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/auth`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                AuthService,
                provideHttpClient(),
                provideHttpClientTesting()
            ]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        localStorage.clear();
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    describe('login', () => {
        it('should send a POST request to the correct URL', () => {
            const request: LoginRequest = { username: 'mehmet', password: 'test123' };
            const mockResponse: AuthResponse = { token: 'fake-jwt-token', username: 'mehmet', email: 'mehmet@test.com' };

            service.login(request).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/login`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);

            req.flush(mockResponse);
        });

        it('should save the token to localStorage on successful login', () => {
            const request: LoginRequest = { username: 'mehmet', password: 'test123' };
            const mockResponse: AuthResponse = { token: 'fake-jwt-token', username: 'mehmet', email: 'mehmet@test.com' };

            service.login(request).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/login`);
            req.flush(mockResponse);

            expect(localStorage.getItem('token')).toBe('fake-jwt-token');
        });
    });

    describe('register', () => {
        it('should send a POST request to the correct URL', () => {
            const request: RegisterRequest = { username: 'newuser', email: 'newuser@test.com', password: 'test123' };
            const mockResponse: AuthResponse = { token: 'fake-jwt-token', username: 'newuser', email: 'mehmet@test.com' };

            service.register(request).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/register`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);

            req.flush(mockResponse);
        });

        it('should save the token to localStorage on successful registration', () => {
            const request: RegisterRequest = { username: 'newuser', email: 'newuser@test.com', password: 'test123' };
            const mockResponse: AuthResponse = { token: 'fake-jwt-token', username: 'newuser', email: 'mehmet@test.com' };

            service.register(request).subscribe();

            const req = httpMock.expectOne(`${apiUrl}/register`);
            req.flush(mockResponse);

            expect(localStorage.getItem('token')).toBe('fake-jwt-token');
        });
    });

    describe('saveToken', () => {
        it('should store the token in localStorage under the "token" key', () => {
            service.saveToken('my-token-value');
            expect(localStorage.getItem('token')).toBe('my-token-value');
        });
    });

    describe('getToken', () => {
        it('should return the token when it exists in localStorage', () => {
            localStorage.setItem('token', 'existing-token');
            expect(service.getToken()).toBe('existing-token');
        });

        it('should return null when no token exists in localStorage', () => {
            expect(service.getToken()).toBeNull();
        });
    });

    describe('isLoggedIn', () => {
        it('should return true when a token exists', () => {
            localStorage.setItem('token', 'some-token');
            expect(service.isLoggedIn()).toBe(true);
        });

        it('should return false when no token exists', () => {
            expect(service.isLoggedIn()).toBe(false);
        });
    });

    describe('logout', () => {
        it('should remove the token from localStorage', () => {
            localStorage.setItem('token', 'some-token');
            service.logout();
            expect(localStorage.getItem('token')).toBeNull();
        });
    });
});