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
import { HouseholdMembershipService } from './household-membership.service';
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
  const statusSig = signal<'loading' | 'error' | 'ready'>('loading');
  const hasMembershipsSig = signal(false);

  beforeEach(() => {
    statusSig.set('loading');
    hasMembershipsSig.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: HouseholdMembershipService,
          useValue: { status: statusSig, hasMemberships: hasMembershipsSig },
        },
      ],
    });
  });

  it('redirects to /app/home when memberships exist', async () => {
    statusSig.set('ready');
    hasMembershipsSig.set(true);
    const router = TestBed.inject(Router);
    const result = await resolve(runGuard(noMembershipGuard));
    expect(router.serializeUrl(result as UrlTree)).toBe('/app/home');
  });

  it('allows through when no memberships', async () => {
    statusSig.set('ready');
    hasMembershipsSig.set(false);
    const result = await resolve(runGuard(noMembershipGuard));
    expect(result).toBe(true);
  });

  it('redirects to /app/error on error state', async () => {
    statusSig.set('error');
    const router = TestBed.inject(Router);
    const result = await resolve(runGuard(noMembershipGuard));
    expect(router.serializeUrl(result as UrlTree)).toBe('/app/error');
  });

  it('does not settle while status is loading; resolves once it transitions', async () => {
    statusSig.set('loading');
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

    statusSig.set('ready');
    hasMembershipsSig.set(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(true);
    expect(resolvedValue).toBe(true);
  });
});
