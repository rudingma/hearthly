import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type CanMatchFn, Router, type UrlSegment } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from './auth.service';

function isErrorRoute(segments: UrlSegment[]): boolean {
  const last = segments[segments.length - 1];
  return last?.path === 'error';
}

export const authGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return toObservable(auth.authState).pipe(
    filter((s) => s.state !== 'loading'),
    take(1),
    map((s) => {
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
    })
  );
};
