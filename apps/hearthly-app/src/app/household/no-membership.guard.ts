import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { HouseholdMembershipService } from './household-membership.service';

export const noMembershipGuard: CanMatchFn = () => {
  const svc = inject(HouseholdMembershipService);
  const router = inject(Router);
  return toObservable(svc.status).pipe(
    filter((s) => s !== 'loading'),
    take(1),
    map((s) => {
      if (s === 'error') return router.createUrlTree(['/app/error']);
      return !svc.hasMemberships() || router.createUrlTree(['/app/home']);
    })
  );
};
