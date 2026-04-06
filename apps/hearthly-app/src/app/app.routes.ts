import type { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { HomeComponent } from './home/home.component';

export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', component: HomeComponent },
    ],
  },
];
