import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { AppErrorComponent } from './app-error.component';
import { HouseholdMembershipService } from '../household-membership.service';
import { AuthService, type AuthState } from '../../auth/auth.service';

describe('AppErrorComponent', () => {
  let householdStatus: ReturnType<typeof signal<'loading' | 'error' | 'ready'>>;
  let authState: ReturnType<typeof signal<AuthState>>;
  let householdRetry: ReturnType<typeof vi.fn>;
  let authRetry: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    householdStatus = signal<'loading' | 'error' | 'ready'>('ready');
    authState = signal<AuthState>({
      state: 'authenticated',
      user: { id: 'u1' } as any,
    });
    householdRetry = vi.fn().mockResolvedValue(undefined);
    authRetry = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [AppErrorComponent],
      providers: [
        provideRouter([]),
        {
          provide: HouseholdMembershipService,
          useValue: { status: householdStatus, retry: householdRetry },
        },
        { provide: AuthService, useValue: { authState, retry: authRetry } },
      ],
    }).compileComponents();
    const router = TestBed.inject(Router);
    navigateSpy = vi
      .spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true) as any;
  });

  it('renders retry button', () => {
    householdStatus.set('error');
    const f = TestBed.createComponent(AppErrorComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const btn = el.querySelector<HTMLButtonElement>(
      '[data-testid="household-error-retry"]'
    );
    expect(btn).not.toBeNull();
  });

  describe('household-layer error (auth authenticated, household error)', () => {
    beforeEach(() => {
      authState.set({ state: 'authenticated', user: { id: 'u1' } as any });
      householdStatus.set('error');
    });

    it('on retry success, navigates to /app/home', async () => {
      householdRetry.mockImplementation(async () => {
        householdStatus.set('ready');
      });
      const f = TestBed.createComponent(AppErrorComponent);
      f.detectChanges();
      await f.componentInstance.onRetry();
      expect(householdRetry).toHaveBeenCalled();
      expect(authRetry).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith('/app/home');
    });

    it('on retry still failing, shows second-try copy and does NOT navigate', async () => {
      householdRetry.mockImplementation(async () => {
        // status stays 'error'
      });
      const f = TestBed.createComponent(AppErrorComponent);
      f.detectChanges();
      await f.componentInstance.onRetry();
      f.detectChanges();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(f.componentInstance.hasRetried()).toBe(true);
    });
  });

  describe('auth-layer error (authState === error)', () => {
    beforeEach(() => {
      authState.set({ state: 'error', error: 'idp down' });
    });

    it('calls authService.retry(), not householdService.retry()', async () => {
      authRetry.mockImplementation(async () => {
        authState.set({ state: 'authenticated', user: { id: 'u1' } as any });
      });
      const f = TestBed.createComponent(AppErrorComponent);
      f.detectChanges();
      await f.componentInstance.onRetry();
      expect(authRetry).toHaveBeenCalled();
      expect(householdRetry).not.toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith('/app/home');
    });

    it('on retry still failing, stays on page with second-try copy', async () => {
      authRetry.mockImplementation(async () => {
        // authState stays in error
      });
      const f = TestBed.createComponent(AppErrorComponent);
      f.detectChanges();
      await f.componentInstance.onRetry();
      f.detectChanges();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(f.componentInstance.hasRetried()).toBe(true);
    });

    // LOAD-BEARING round-5 fix: IdP recovers but user isn't signed in →
    // authState='unauthenticated' — must route to welcome, not stuck on /app/error.
    it('on retry landing at unauthenticated, navigates to / (welcome)', async () => {
      authRetry.mockImplementation(async () => {
        authState.set({ state: 'unauthenticated' });
      });
      const f = TestBed.createComponent(AppErrorComponent);
      f.detectChanges();
      await f.componentInstance.onRetry();
      expect(authRetry).toHaveBeenCalled();
      expect(navigateSpy).toHaveBeenCalledWith('/');
      expect(f.componentInstance.hasRetried()).toBe(false);
    });
  });
});
