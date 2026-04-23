import { Injectable, inject, computed, type Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { MyHouseholdsGQL } from '../../generated/graphql';
import type { MyHouseholdsQuery } from '../../generated/graphql';

type Household = MyHouseholdsQuery['myHouseholds'][number];

type HouseholdState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; households: Household[] };

@Injectable({ providedIn: 'root' })
export class HouseholdMembershipService {
  private readonly myHouseholdsGQL = inject(MyHouseholdsGQL);
  private readonly authService = inject(AuthService);

  /**
   * The activeQuery is scoped to the current authenticated session. It is
   * created fresh inside switchMap when auth transitions to 'authenticated',
   * and nulled on logout. This is the tenant-isolation boundary: user B
   * NEVER sees user A's cached myHouseholds because each session gets a
   * new QueryRef + forced network-only initial fetch.
   */
  private activeQuery: ReturnType<MyHouseholdsGQL['watch']> | null = null;

  /**
   * State is driven by auth state via switchMap:
   *   - auth.state !== 'authenticated' → park at 'loading'; dispose any
   *     active query reference.
   *   - auth.state === 'authenticated' → construct a fresh watchQuery with
   *     fetchPolicy: 'network-only' (per-session network fetch)
   *     + nextFetchPolicy: 'cache-first' (in-session cache reads)
   *     + errorPolicy: 'all' (errors arrive as result.error, stream never
   *       terminates).
   */
  private readonly source$ = toObservable(this.authService.authState).pipe(
    switchMap((auth) => {
      if (auth.state !== 'authenticated') {
        this.activeQuery = null;
        return of<HouseholdState>({ status: 'loading' });
      }
      this.activeQuery = this.myHouseholdsGQL.watch({
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'all',
        // Explicit — Apollo Client v4 defaults this to true. We want false
        // so valueChanges doesn't re-emit loading:true on refetch, which
        // would flicker the guard mid-refetch.
        notifyOnNetworkStatusChange: false,
      });
      return this.activeQuery.valueChanges.pipe(
        map((r): HouseholdState => {
          if (r.error) return { status: 'error', error: r.error };
          if (r.loading) return { status: 'loading' };
          return {
            status: 'ready',
            households: (r.data?.myHouseholds ?? []) as Household[],
          };
        })
      );
    })
  );

  private readonly state: Signal<HouseholdState> = toSignal(this.source$, {
    initialValue: { status: 'loading' } satisfies HouseholdState,
  }) as Signal<HouseholdState>;

  readonly status = computed(() => this.state().status);
  readonly households = computed<Household[]>(() => {
    const s = this.state();
    return s.status === 'ready' ? s.households : [];
  });
  readonly error = computed(() => {
    const s = this.state();
    return s.status === 'error' ? s.error : null;
  });
  readonly hasMemberships = computed<boolean>(() => {
    const s = this.state();
    return s.status === 'ready' && s.households.length > 0;
  });

  /**
   * Used by AppErrorComponent's Retry button. Swallows refetch rejection
   * so the component's `await svc.retry()` can inspect status afterwards —
   * the error state already flows through the signal via result.error.
   */
  async retry(): Promise<void> {
    try {
      await this.activeQuery?.refetch();
    } catch {
      // Error state flows through the signal via result.error on next
      // valueChanges emission (errorPolicy: 'all'). Swallowing keeps
      // `await svc.retry()` from throwing before status check.
    }
  }
}
