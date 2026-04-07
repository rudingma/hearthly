import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { signal, computed } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

function createMockAuthService(overrides: { loading?: boolean; authenticated?: boolean; error?: string | null } = {}) {
  const currentUser = signal(overrides.authenticated ? { name: 'Test', email: 'test@test.com', id: '1' } : null);
  return {
    currentUser,
    isAuthenticated: computed(() => currentUser() !== null),
    isLoading: signal(overrides.loading ?? false),
    error: signal<string | null>(overrides.error ?? null),
    initials: computed(() => {
      const name = currentUser()?.name;
      if (!name) return '';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
    init: vi.fn(),
  };
}

describe('authGuard', () => {
  it('should redirect to / when not authenticated', () => {
    const mockAuth = createMockAuthService();
    const createUrlTree = vi.fn().mockReturnValue({} as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
    expect(mockAuth.login).not.toHaveBeenCalled();
  });

  it('should allow access when authenticated', () => {
    const mockAuth = createMockAuthService({ authenticated: true });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(true);
  });

  it('should return false when loading', () => {
    const mockAuth = createMockAuthService({ loading: true });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(false);
  });

  it('should allow access when error (API down) so component can show error state', () => {
    const mockAuth = createMockAuthService({ error: 'Failed to load user profile' });

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result).toBe(true);
  });
});
