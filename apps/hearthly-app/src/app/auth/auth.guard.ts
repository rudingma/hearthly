import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  // Init still in progress — don't navigate or redirect
  if (authService.isLoading()) {
    return false;
  }

  // If authenticated, allow navigation
  if (authService.isAuthenticated()) {
    return true;
  }

  // If we have a valid token but me query failed (API down), don't redirect
  // The error state will be shown by the component
  if (authService.error()) {
    return true;
  }

  // No token — redirect to Keycloak login
  authService.login();
  return false;
};
