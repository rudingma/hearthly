import { inject } from '@angular/core';
import { type CanMatchFn, Router, type UrlSegment } from '@angular/router';
import { AuthService } from './auth.service';
import { waitForNonLoading } from '../common/router/wait-for-non-loading';

function isErrorRoute(segments: UrlSegment[]): boolean {
  const last = segments[segments.length - 1];
  return last?.path === 'error';
}

export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return waitForNonLoading(
    auth.authState,
    (s) => s.state === 'loading',
    (s) => {
      switch (s.state) {
        case 'authenticated':
          return true;
        case 'unauthenticated':
          return router.createUrlTree(['/']);
        case 'error':
          return isErrorRoute(segments)
            ? true
            : router.createUrlTree(['/app/error']);
        default:
          return router.createUrlTree(['/']);
      }
    }
  );
};
