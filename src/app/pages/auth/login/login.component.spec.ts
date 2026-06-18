import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../models/auth.model';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
    let fixture: ComponentFixture<LoginComponent>;
    let component: LoginComponent;
    let authServiceMock: { login: ReturnType<typeof vi.fn> };
    let router: Router;
    // LoginComponent imports MatSnackBarModule which registers MatSnackBar at module-level
    // injector — closer in the DI chain than the TestBed root injector.  A root-level
    // { provide: MatSnackBar, useValue: mock } is shadowed and never reached.
    // We resolve the real instance from the component's element injector and spy on it instead.
    let snackBar: MatSnackBar;

    beforeEach(async () => {
        authServiceMock = { login: vi.fn() };

        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                // provideRouter([]) gives the real Router + ActivatedRoute infrastructure.
                // RouterLink in the template calls inject(ActivatedRoute) — it must be real.
                // We do NOT also provide a Router mock here: doing so replaces the Router token
                // with our plain object, and the router's own internal factories then crash when
                // they inject Router and find an object with no .root property.
                provideRouter([]),
                { provide: AuthService, useValue: authServiceMock }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;

        // Spy on the real Router instance AFTER the injector is built.
        router = TestBed.inject(Router);
        vi.spyOn(router, 'navigate').mockResolvedValue(true);

        // Resolve MatSnackBar from the component's own injector (module-level) and spy on it.
        snackBar = fixture.debugElement.injector.get(MatSnackBar);
        vi.spyOn(snackBar, 'open').mockReturnValue(null as any);

        fixture.detectChanges();
    });

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    // --- Rendering ---

    it('should render a username input and a password input', () => {
        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('input[formcontrolname="username"]')).toBeTruthy();
        expect(el.querySelector('input[formcontrolname="password"]')).toBeTruthy();
    });

    // --- Form validation ---

    it('should have an invalid form when both fields are empty', () => {
        // Reactive form is initialised with empty strings and Validators.required on both.
        expect(component.form.invalid).toBe(true);
    });

    it('should have a valid form when both fields are filled', () => {
        component.form.setValue({ username: 'mehmet', password: 'secret' });
        expect(component.form.valid).toBe(true);
    });

    it('should mark username as required when touched while empty', () => {
        component.form.get('username')!.markAsTouched();
        expect(component.form.get('username')!.hasError('required')).toBe(true);
    });

    it('should mark password as required when touched while empty', () => {
        component.form.get('password')!.markAsTouched();
        expect(component.form.get('password')!.hasError('required')).toBe(true);
    });

    // --- Submit guard ---

    it('should NOT call authService.login when form is invalid', () => {
        // form is empty → invalid.  submit() has an early return for this case.
        component.submit();
        expect(authServiceMock.login).not.toHaveBeenCalled();
    });

    // --- Loading state ---

    it('should set loading = true while the request is in-flight', () => {
        // A Subject lets us control exactly when the observable emits, so we can
        // inspect component state *before* the response arrives.
        const pending$ = new Subject<AuthResponse>();
        authServiceMock.login.mockReturnValue(pending$.asObservable());

        component.form.setValue({ username: 'mehmet', password: 'secret' });
        component.submit();

        // submit() sets loading = true then subscribes.  The subject hasn't emitted yet.
        expect(component.loading).toBe(true);

        // Clean up the subscription.
        pending$.error(new Error('cancelled'));
    });

    // --- Success path ---

    it('should call authService.login with the form values on valid submit', () => {
        authServiceMock.login.mockReturnValue(of({ token: 'tok', username: 'mehmet', email: 'a@b.com' }));
        component.form.setValue({ username: 'mehmet', password: 'secret' });
        component.submit();
        expect(authServiceMock.login).toHaveBeenCalledWith({ username: 'mehmet', password: 'secret' });
    });

    it('should navigate to /map on successful login', () => {
        authServiceMock.login.mockReturnValue(of({ token: 'tok', username: 'mehmet', email: 'a@b.com' }));
        component.form.setValue({ username: 'mehmet', password: 'secret' });
        component.submit();
        expect(router.navigate).toHaveBeenCalledWith(['/map']);
    });

    // --- Error path ---

    it('should reset loading to false and NOT navigate on login failure', () => {
        authServiceMock.login.mockReturnValue(throwError(() => new Error('401')));
        component.form.setValue({ username: 'mehmet', password: 'wrong' });
        component.submit();

        expect(component.loading).toBe(false);
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should open a snackbar with the correct message on login failure', () => {
        authServiceMock.login.mockReturnValue(throwError(() => new Error('401')));
        component.form.setValue({ username: 'mehmet', password: 'wrong' });
        component.submit();

        expect(snackBar.open).toHaveBeenCalledWith(
            'Invalid username or password',
            'Close',
            expect.objectContaining({ duration: 3000, panelClass: ['error-snackbar'] })
        );
    });

    // --- Password visibility toggle ---

    it('should start with password hidden (hidePassword = true)', () => {
        expect(component.hidePassword).toBe(true);
    });

    it('should reveal the password when the visibility toggle button is clicked', () => {
        // The only type="button" in the form is the visibility toggle.
        // The submit button has type="submit".
        const toggleBtn = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;
        toggleBtn.click();
        expect(component.hidePassword).toBe(false);
    });

    it('should hide the password again on a second toggle click', () => {
        const toggleBtn = fixture.nativeElement.querySelector('button[type="button"]') as HTMLButtonElement;
        toggleBtn.click(); // hide → show
        toggleBtn.click(); // show → hide
        expect(component.hidePassword).toBe(true);
    });
});
