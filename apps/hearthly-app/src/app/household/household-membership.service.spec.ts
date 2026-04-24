import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { ApolloQueryResult } from '@apollo/client/core';
import { HouseholdMembershipService } from './household-membership.service';
import { AuthService, type AuthState } from '../auth/auth.service';
import {
  MyHouseholdsGQL,
  type MyHouseholdsQuery,
} from '../../generated/graphql';

type Result = ApolloQueryResult<MyHouseholdsQuery>;

function buildReady(data: MyHouseholdsQuery): Result {
  return {
    loading: false,
    data,
    networkStatus: 7,
    partial: false,
  } as Result;
}

function buildError(err: Error): Result {
  return {
    loading: false,
    data: undefined as any,
    error: err,
    networkStatus: 8,
    partial: true,
  } as Result;
}

/**
 * Sets up the TestBed with mock providers and returns helpers.
 *
 * Effect flushing notes:
 * - `toObservable(signal)` wraps the signal in an Angular `effect()`. Effects
 *   do NOT fire on their own via `await Promise.resolve()` in TestBed — they
 *   require `TestBed.flushEffects()` (which calls `appRef.tick()` →
 *   `EffectScheduler.flush()`). Call `flush()` below after any signal change
 *   that must propagate through `switchMap`.
 * - `Subject.next()` and the RxJS chain are synchronous. After a `next()` call
 *   the `toSignal` state signal is already updated — no `await` needed.
 */
function setupWith(authInitial: AuthState = { state: 'loading' }) {
  const subjects: Subject<Result>[] = [];
  const refetchFns: Array<ReturnType<typeof vi.fn>> = [];
  const watchOptions: unknown[] = [];
  const authState = signal<AuthState>(authInitial);
  const gql = {
    watch: (opts?: unknown) => {
      watchOptions.push(opts);
      const subject = new Subject<Result>();
      const refetch = vi.fn(async () => buildReady({ myHouseholds: [] }));
      subjects.push(subject);
      refetchFns.push(refetch);
      return { valueChanges: subject.asObservable(), refetch };
    },
  };

  TestBed.configureTestingModule({
    providers: [
      HouseholdMembershipService,
      { provide: MyHouseholdsGQL, useValue: gql },
      { provide: AuthService, useValue: { authState } },
    ],
  });

  return {
    authState,
    currentSubject: () => subjects[subjects.length - 1],
    currentRefetch: () => refetchFns[refetchFns.length - 1],
    sessions: () => subjects.length,
    lastWatchOptions: () => watchOptions[watchOptions.length - 1],
    /** Flush pending Angular effects (effect() / toObservable scheduling). */
    flush: () => TestBed.flushEffects(),
  };
}

const AUTHENTICATED: AuthState = {
  state: 'authenticated',
  user: { id: 'u1', email: 'e@test' } as any,
};

describe('HouseholdMembershipService', () => {
  it('initial state is loading', () => {
    setupWith({ state: 'loading' });
    const svc = TestBed.inject(HouseholdMembershipService);
    expect(svc.state().status).toBe('loading');
  });

  it('stays at loading while unauthenticated — no watchQuery is created', () => {
    const h = setupWith({ state: 'unauthenticated' });
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    expect(svc.state().status).toBe('loading');
    expect(h.sessions()).toBe(0);
  });

  it('creates a watchQuery when auth transitions to authenticated', () => {
    const h = setupWith({ state: 'loading' });
    TestBed.inject(HouseholdMembershipService);
    h.authState.set(AUTHENTICATED);
    h.flush();
    expect(h.sessions()).toBe(1);
    expect(h.lastWatchOptions()).toEqual(
      expect.objectContaining({
        fetchPolicy: 'network-only',
        nextFetchPolicy: 'cache-first',
        errorPolicy: 'all',
        notifyOnNetworkStatusChange: false,
      })
    );
  });

  it('transitions to ready (empty) once authenticated and result arrives', () => {
    const h = setupWith(AUTHENTICATED);
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    h.currentSubject().next(buildReady({ myHouseholds: [] }));
    const s = svc.state();
    expect(s.status).toBe('ready');
    if (s.status === 'ready') {
      expect(s.households).toEqual([]);
    }
  });

  it('transitions to ready (populated) once authenticated and result arrives', () => {
    const h = setupWith(AUTHENTICATED);
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    h.currentSubject().next(
      buildReady({
        myHouseholds: [
          { id: 'h1', name: 'Smith', createdAt: 't', updatedAt: 't' },
        ],
      })
    );
    const s = svc.state();
    expect(s.status).toBe('ready');
    if (s.status === 'ready') {
      expect(s.households).toHaveLength(1);
    }
  });

  it('enters error state when result.error is populated', () => {
    const h = setupWith(AUTHENTICATED);
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    const err = new Error('network');
    h.currentSubject().next(buildError(err));
    const s = svc.state();
    expect(s.status).toBe('error');
    if (s.status === 'error') {
      expect(s.error).toBe(err);
    }
  });

  it('recovers from error when next emission is a success', () => {
    const h = setupWith(AUTHENTICATED);
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    h.currentSubject().next(buildError(new Error('transient')));
    expect(svc.state().status).toBe('error');

    h.currentSubject().next(
      buildReady({
        myHouseholds: [
          { id: 'h1', name: 'Recovered', createdAt: 't', updatedAt: 't' },
        ],
      })
    );
    const s = svc.state();
    expect(s.status).toBe('ready');
    if (s.status === 'ready') {
      expect(s.households).toHaveLength(1);
    }
  });

  it('retry() swallows refetch rejection (no throw)', async () => {
    const h = setupWith(AUTHENTICATED);
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    h.currentRefetch().mockRejectedValueOnce(new Error('still down'));
    h.currentSubject().next(buildError(new Error('was down')));
    expect(svc.state().status).toBe('error');

    await expect(svc.retry()).resolves.toBeUndefined();
    expect(h.currentRefetch()).toHaveBeenCalled();
    expect(svc.state().status).toBe('error');
  });

  it('parks at loading when auth is in error state — no watchQuery', () => {
    const h = setupWith({ state: 'error', error: 'auth failed' });
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    expect(svc.state().status).toBe('loading');
    expect(h.sessions()).toBe(0);
  });

  it('retry() is a no-op when no active query (pre-auth)', async () => {
    setupWith({ state: 'loading' });
    const svc = TestBed.inject(HouseholdMembershipService);
    await expect(svc.retry()).resolves.toBeUndefined();
    expect(svc.state().status).toBe('loading');
  });

  it('creates a fresh watchQuery per authenticated session', () => {
    const h = setupWith(AUTHENTICATED);
    const svc = TestBed.inject(HouseholdMembershipService);
    h.flush();
    h.currentSubject().next(
      buildReady({
        myHouseholds: [
          { id: 'hA', name: 'User A hh', createdAt: 't', updatedAt: 't' },
        ],
      })
    );
    const s1 = svc.state();
    expect(s1.status).toBe('ready');
    if (s1.status === 'ready') {
      expect(s1.households).toHaveLength(1);
    }
    expect(h.sessions()).toBe(1);

    h.authState.set({ state: 'unauthenticated' });
    h.flush();
    expect(svc.state().status).toBe('loading');

    h.authState.set({
      state: 'authenticated',
      user: { id: 'u2', email: 'b@test' } as any,
    });
    h.flush();
    expect(h.sessions()).toBe(2);

    h.currentSubject().next(buildReady({ myHouseholds: [] }));
    const s2 = svc.state();
    expect(s2.status).toBe('ready');
    if (s2.status === 'ready') {
      expect(s2.households).toHaveLength(0);
    }
  });
});
