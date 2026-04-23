import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { householdMembershipGuard } from './household/household-membership.guard';
import { noMembershipGuard } from './household/no-membership.guard';
import { ResponsiveShellComponent } from './shell/responsive-shell.component';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./welcome/welcome.component').then((m) => m.WelcomeComponent),
  },
  {
    path: 'app',
    canMatch: [authGuard],
    children: [
      {
        path: '',
        component: ResponsiveShellComponent,
        children: [
          {
            path: 'home',
            canMatch: [householdMembershipGuard],
            loadComponent: () =>
              import('./home/home.component').then((m) => m.HomeComponent),
            title: 'Home',
          },
          {
            path: 'start',
            canMatch: [noMembershipGuard],
            loadComponent: () =>
              import('./household/start/start.component').then(
                (m) => m.StartComponent
              ),
            title: 'Welcome',
          },
          {
            path: 'start/new',
            canMatch: [noMembershipGuard],
            loadComponent: () =>
              import('./household/start-new/start-new.component').then(
                (m) => m.StartNewComponent
              ),
            title: 'Create Household',
          },
          {
            path: 'join',
            canMatch: [noMembershipGuard],
            loadComponent: () =>
              import('./household/join-stub/join-stub.component').then(
                (m) => m.JoinStubComponent
              ),
            title: 'Join Household',
          },
          { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
      },
      {
        path: 'error',
        loadComponent: () =>
          import('./household/app-error/app-error.component').then(
            (m) => m.AppErrorComponent
          ),
        title: 'Error',
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
