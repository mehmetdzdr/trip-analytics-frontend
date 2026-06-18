import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../models/auth.model';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
    let fixture: ComponentFixture<RegisterComponent>;
    let component: RegisterComponent;
    let authServiceMock: { register: ReturnType<typeof vi.fn> };
    let router: Router;
    let snackBarMock: { open: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        authServiceMock = { register: vi.fn() };
        snackBarMock = { open: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [
                // Same reasoning as LoginComponent: provideRouter([]) for real Router infrastructure,
                // then vi.spyOn on the real instance instead of replacing the Router token.
                provideRouter([]),
                { provide: AuthService, useValue: authServiceMock },
                { provide: MatSnackBar, useValue: snackBarMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(RegisterComponent);
        component = fixture.componentInstance;

        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);

        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    // --- Rendering ---

    it('should render username, email, and password inputs', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('input[formcontrolname="username"]')).toBeTruthy();
        expect(el.querySelector('input[formcontrolname="email"]')).toBeTruthy();
        expect(el.querySelector('input[formcontrolname="password"]')).toBeTruthy();
    });

    // --- Required validators ---

    it('should be invalid when all fields are empty', () => {
        expect(component.form.invalid).toBe(true);
    });

    it('should mark username as required when left empty', () => {
        component.form.get('username')!.markAsTouched();
        expect(component.form.get('username')!.hasError('required')).toBe(true);
    });

    it('should mark email as required when left empty', () => {
        component.form.get('email')!.markAsTouched();
        expect(component.form.get('email')!.hasError('required')).toBe(true);
    });

    it('should mark password as required when left empty', () => {
        component.form.get('password')!.markAsTouched();
        expect(component.form.get('password')!.hasError('required')).toBe(true);
    });

    // --- minLength validators ---

    it('should have a minlength error on username when fewer than 3 characters', () => {
        // 'ab' is 2 chars — exactly one below the limit.  This tests the boundary.
        component.form.get('username')!.setValue('ab');
        expect(component.form.get('username')!.hasError('minlength')).toBe(true);
    });

    it('should NOT have a minlength error on username with exactly 3 characters', () => {
        component.form.get('username')!.setValue('abc');
        expect(component.form.get('username')!.hasError('minlength')).toBe(false);
    });

    it('should have a minlength error on password when fewer than 6 characters', () => {
        component.form.get('password')!.setValue('12345');
        expect(component.form.get('password')!.hasError('minlength')).toBe(true);
    });

    it('should NOT have a minlength error on password with exactly 6 characters', () => {
        component.form.get('password')!.setValue('123456');
        expect(component.form.get('password')!.hasError('minlength')).toBe(false);
    });

    // --- Email format validator ---

    it('should have an email error when the email field contains an invalid address', () => {
        component.form.get('email')!.setValue('not-an-email');
        expect(component.form.get('email')!.hasError('email')).toBe(true);
    });

    it('should NOT have an email error for a valid email address', () => {
        component.form.get('email')!.setValue('user@example.com');
        expect(component.form.get('email')!.hasError('email')).toBe(false);
    });

    // --- Submit guard ---

    it('should NOT call authService.register when form is invalid', () => {
        component.submit();
        expect(authServiceMock.register).not.toHaveBeenCalled();
    });

    // --- Loading state ---

    it('should set loading = true while the request is in-flight', () => {
        // Same Subject pattern as LoginComponent — resolves only when we push a value.
        const pending$ = new Subject<AuthResponse>();
        authServiceMock.register.mockReturnValue(pending$.asObservable());

        component.form.setValue({ username: 'newuser', email: 'new@test.com', password: 'pass123' });
        component.submit();

        expect(component.loading).toBe(true);

        pending$.error(new Error('cancelled'));
    });

    // --- Success path ---

    it('should call authService.register with all form values on valid submit', () => {
        authServiceMock.register.mockReturnValue(of({ token: 'tok', username: 'newuser', email: 'new@test.com' }));
        component.form.setValue({ username: 'newuser', email: 'new@test.com', password: 'pass123' });
        component.submit();
        expect(authServiceMock.register).toHaveBeenCalledWith({
            username: 'newuser',
            email: 'new@test.com',
            password: 'pass123'
        });
    });

    it('should navigate to /map on successful registration', () => {
        authServiceMock.register.mockReturnValue(of({ token: 'tok', username: 'newuser', email: 'new@test.com' }));
        component.form.setValue({ username: 'newuser', email: 'new@test.com', password: 'pass123' });
        component.submit();
        expect(router.navigate).toHaveBeenCalledWith(['/map']);
    });

    // --- Error path ---

    it('should reset loading to false and NOT navigate on registration failure', () => {
        authServiceMock.register.mockReturnValue(throwError(() => new Error('409')));
        component.form.setValue({ username: 'newuser', email: 'new@test.com', password: 'pass123' });
        component.submit();

        expect(component.loading).toBe(false);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should open a snackbar with the correct message on registration failure', () => {
        authServiceMock.register.mockReturnValue(throwError(() => new Error('409')));
        component.form.setValue({ username: 'newuser', email: 'new@test.com', password: 'pass123' });
        component.submit();

        expect(snackBarMock.open).toHaveBeenCalledWith(
            'Username or email already exists',
            'Close',
            expect.objectContaining({ duration: 3000, panelClass: ['error-snackbar'] })
        );
    });

    // --- Password visibility toggle ---

    it('should start with password hidden', () => {
        expect(component.hidePassword).toBe(true);
    });

    it('should toggle password visibility on button click', () => {
        const toggleBtn = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;
        toggleBtn.click();
        expect(component.hidePassword).toBe(false);
    });
});
