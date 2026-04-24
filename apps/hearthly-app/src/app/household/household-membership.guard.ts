import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import {
  HouseholdMembershipService,
  type HouseholdState,
} from './household-membership.service';
import { waitForNonLoading } from '../common/router/wait-for-non-loading';

export const householdMembershipGuard: CanMatchFn = () => {
  const svc = inject(HouseholdMembershipService);
  const router = inject(Router);
  return waitForNonLoading(
    svc.state,
    (s): s is Extract<HouseholdState, { status: 'loading' }> =>
      s.status === 'loading',
    (s) => {
      if (s.status === 'error') return router.createUrlTree(['/app/error']);
      return s.households.length > 0
        ? true
        : router.createUrlTree(['/app/start']);
    }
  );
};
