import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  UrlSegment,
  provideRouter,
  type UrlTree,
} from '@angular/router';
import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService, type AuthState } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard (CanMatchFn branching on authState)', () => {
  let authState: ReturnType<typeof signal<AuthState>>;

  beforeEach(() => {
    authState = signal<AuthState>({ state: 'loading' });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { authState } },
      ],
    });
  });

  async function evaluate(
    segments: UrlSegment[] = []
  ): Promise<boolean | UrlTree> {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as any, segments)
    );
    return firstValueFrom(result as any) as Promise<boolean | UrlTree>;
  }

  it('waits until authState is no longer loading', async () => {
    authState.set({ state: 'authenticated', user: { id: 'u1' } as any });
    await expect(evaluate()).resolves.toBe(true);
  });

  it('returns UrlTree("/") when unauthenticated', async () => {
    authState.set({ state: 'unauthenticated' });
    const router = TestBed.inject(Router);
    const result = await evaluate();
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });

  it('returns UrlTree("/app/error") when auth is in error state — non-error target', async () => {
    authState.set({ state: 'error', error: 'idp down' });
    const router = TestBed.inject(Router);
    const result = await evaluate([
      new UrlSegment('app', {}),
      new UrlSegment('home', {}),
    ]);
    expect(router.serializeUrl(result as UrlTree)).toBe('/app/error');
  });

  it('allows through when error state AND target is /app/error', async () => {
    authState.set({ state: 'error', error: 'idp down' });
    const result = await evaluate([
      new UrlSegment('app', {}),
      new UrlSegment('error', {}),
    ]);
    expect(result).toBe(true);
  });

  it('allows through when authenticated', async () => {
    authState.set({ state: 'authenticated', user: { id: 'u1' } as any });
    await expect(evaluate()).resolves.toBe(true);
  });

  it('does not settle while authState is loading; resolves once it transitions', async () => {
    authState.set({ state: 'loading' });
    const result$ = TestBed.runInInjectionContext(() =>
      authGuard({} as any, [
        new UrlSegment('app', {}),
        new UrlSegment('home', {}),
      ])
    );
    let settled = false;
    let resolvedValue: boolean | UrlTree | undefined;
    (result$ as any).subscribe((v: boolean | UrlTree) => {
      settled = true;
      resolvedValue = v;
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(false);

    authState.set({ state: 'authenticated', user: { id: 'u1' } as any });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(true);
    expect(resolvedValue).toBe(true);
  });
});
