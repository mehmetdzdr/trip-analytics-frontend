import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {

    return true; // Placeholder for actual authentication logic
    //const authService = inject(AuthService);
    //const router = inject(Router);

    //if (authService.isLoggedIn()) {
    //    return true;
    //}

    //router.navigate(['/login']);
    //return false;
};