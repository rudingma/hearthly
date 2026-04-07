import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { ShellComponent } from './shell/shell.component';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./welcome/welcome.component').then(m => m.WelcomeComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: ShellComponent,
        children: [
          { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) },
          { path: 'budget', loadComponent: () => import('./budget/budget.component').then(m => m.BudgetComponent) },
          { path: 'lists', loadComponent: () => import('./lists/lists.component').then(m => m.ListsComponent) },
          { path: 'calendar', loadComponent: () => import('./calendar/calendar.component').then(m => m.CalendarComponent) },
          { path: '', redirectTo: 'home', pathMatch: 'full' },
        ],
      },
      {
        path: 'account',
        loadComponent: () => import('./account/account.component').then(m => m.AccountComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
