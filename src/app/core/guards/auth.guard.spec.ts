import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
    let authServiceMock: { isLoggedIn: ReturnType<typeof vi.fn> };
    let routerMock: { navigate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        authServiceMock = { isLoggedIn: vi.fn() };
        routerMock = { navigate: vi.fn() };

        TestBed.configureTestingModule({
            providers: [
                { provide: AuthService, useValue: authServiceMock },
                { provide: Router, useValue: routerMock }
            ]
        });
    });

    function runGuard() {
        return TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    }

    it('should allow access and not navigate when the user is logged in', () => {
        authServiceMock.isLoggedIn.mockReturnValue(true);

        const result = runGuard();

        expect(result).toBe(true);
        expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should deny access and navigate to /login when the user is not logged in', () => {
        authServiceMock.isLoggedIn.mockReturnValue(false);

        const result = runGuard();

        expect(result).toBe(false);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
});