import { type Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { type Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

/**
 * Guard-wait building block. Subscribes to a state signal, waits until
 * the state is no longer 'loading' (as defined by the `isLoading` type
 * predicate), takes that single settled value, and maps it to a route
 * decision via `decide`.
 *
 * `isLoading` is a TypeScript type predicate — `(s: S) => s is SLoading`
 * — so `decide` receives the non-loading narrowed variant via
 * `Exclude<S, SLoading>`. That eliminates unreachable default branches
 * in callers and proves exhaustion at compile time.
 */
export function waitForNonLoading<S, SLoading extends S, R>(
  state: Signal<S>,
  isLoading: (s: S) => s is SLoading,
  decide: (s: Exclude<S, SLoading>) => R
): Observable<R> {
  return toObservable(state).pipe(
    filter((s): s is Exclude<S, SLoading> => !isLoading(s)),
    take(1),
    map(decide)
  );
}
