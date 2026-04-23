import { type Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

/**
 * Guard-wait building block. Subscribes to a state signal, waits until
 * the state is no longer 'loading' (as defined by the `isLoading`
 * predicate), takes that single settled value, and maps it to a route
 * decision via `decide`.
 *
 * Replaces the `toObservable(...).pipe(filter(!loading), take(1), map(...))`
 * pattern that all three household/auth guards would otherwise duplicate.
 * Callers from `CanMatchFn` contexts get a race-free wait without
 * reverting to the `return false` silent-block anti-pattern.
 *
 * @param state - The reactive state signal (typically a discriminated union)
 * @param isLoading - Predicate true while still waiting
 * @param decide - Called exactly once when state settles; returns the guard result
 */
export function waitForNonLoading<S, R>(
  state: Signal<S>,
  isLoading: (s: S) => boolean,
  decide: (s: S) => R
): Observable<R> {
  return toObservable(state).pipe(
    filter((s) => !isLoading(s)),
    take(1),
    map(decide)
  );
}
