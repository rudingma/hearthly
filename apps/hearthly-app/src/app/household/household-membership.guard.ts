import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { HouseholdMembershipService } from './household-membership.service';
import { waitForNonLoading } from '../common/router/wait-for-non-loading';

export const householdMembershipGuard: CanMatchFn = () => {
  const svc = inject(HouseholdMembershipService);
  const router = inject(Router);
  return waitForNonLoading(
    svc.state,
    (s) => s.status === 'loading',
    (s) => {
      if (s.status === 'error') return router.createUrlTree(['/app/error']);
      if (s.status === 'ready')
        return s.households.length > 0 || router.createUrlTree(['/app/start']);
      // loading was filtered out by waitForNonLoading — unreachable at runtime
      return router.createUrlTree(['/app/error']);
    }
  );
};
