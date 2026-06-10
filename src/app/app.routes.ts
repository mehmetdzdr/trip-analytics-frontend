import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'map',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () =>
            import('./pages/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        loadComponent: () =>
            import('./pages/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'map',
        loadComponent: () =>
            import('./pages/map/map-page.component').then(m => m.MapPageComponent),
        canActivate: [authGuard]
    },
    {
        path: 'statistics',
        loadComponent: () =>
            import('./pages/statistics/statistics-page.component').then(m => m.StatisticsPageComponent),
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: 'map'
    }
];
