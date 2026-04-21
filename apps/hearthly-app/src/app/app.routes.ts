import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { ResponsiveShellComponent } from './shell/responsive-shell.component';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./welcome/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: ResponsiveShellComponent,
        children: [
          {
            path: 'home',
            loadComponent: () =>
              import('./home/home.component').then((m) => m.HomeComponent),
            title: 'Home',
          },
          { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./account/account.component').then((m) => m.AccountComponent),
        title: 'Account',
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
