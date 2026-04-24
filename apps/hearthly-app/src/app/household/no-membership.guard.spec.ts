import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  type CanMatchFn,
  type UrlTree,
} from '@angular/router';
import { signal } from '@angular/core';
import { firstValueFrom, isObservable } from 'rxjs';
import {
  HouseholdMembershipService,
  type HouseholdState,
} from './household-membership.service';
import { noMembershipGuard } from './no-membership.guard';

function runGuard(guard: CanMatchFn) {
  return TestBed.runInInjectionContext(() => guard({} as any, []));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolve(result: any): Promise<boolean | UrlTree> {
  if (isObservable(result)) return firstValueFrom(result) as any;
  return result;
}

describe('noMembershipGuard', () => {
  const stateSig = signal<HouseholdState>({ status: 'loading' });

  beforeEach(() => {
    stateSig.set({ status: 'loading' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: HouseholdMembershipService,
          useValue: { state: stateSig },
        },
      ],
    });
  });

  it('redirects to /app/home when memberships exist', async () => {
    stateSig.set({
      status: 'ready',
      households: [{ id: 'h1', name: 'X', createdAt: 't', updatedAt: 't' }],
    });
    const router = TestBed.inject(Router);
    const result = await resolve(runGuard(noMembershipGuard));
    expect(router.serializeUrl(result as UrlTree)).toBe('/app/home');
  });

  it('allows through when no memberships', async () => {
    stateSig.set({ status: 'ready', households: [] });
    const result = await resolve(runGuard(noMembershipGuard));
    expect(result).toBe(true);
  });

  it('redirects to /app/error on error state', async () => {
    stateSig.set({ status: 'error', error: 'down' });
    const router = TestBed.inject(Router);
    const result = await resolve(runGuard(noMembershipGuard));
    expect(router.serializeUrl(result as UrlTree)).toBe('/app/error');
  });

  it('does not settle while status is loading; resolves once it transitions', async () => {
    stateSig.set({ status: 'loading' });
    const result$ = TestBed.runInInjectionContext(() =>
      noMembershipGuard({} as any, [])
    );
    let settled = false;
    let resolvedValue: boolean | UrlTree | undefined;
    (result$ as any).subscribe((v: boolean | UrlTree) => {
      settled = true;
      resolvedValue = v;
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(false);

    stateSig.set({ status: 'ready', households: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(true);
    expect(resolvedValue).toBe(true);
  });
});
