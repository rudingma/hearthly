import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type CanMatchFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { HouseholdMembershipService } from './household-membership.service';

export const householdMembershipGuard: CanMatchFn = () => {
  const svc = inject(HouseholdMembershipService);
  const router = inject(Router);
  return toObservable(svc.state).pipe(
    filter((s) => s.status !== 'loading'),
    take(1),
    map((s) => {
      if (s.status === 'error') return router.createUrlTree(['/app/error']);
      // s.status === 'ready' — TS narrows s to the ready variant.
      return s.households.length > 0 || router.createUrlTree(['/app/start']);
    })
  );
};
