import { TestBed } from '@angular/core/testing';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';
import { MeGQL } from '../../generated/graphql';

describe('AuthService', () => {
  let service: AuthService;
  let mockOAuthService: {
    initCodeFlow: ReturnType<typeof vi.fn>;
    configure: ReturnType<typeof vi.fn>;
    loadDiscoveryDocumentAndTryLogin: ReturnType<typeof vi.fn>;
    hasValidAccessToken: ReturnType<typeof vi.fn>;
    setupAutomaticSilentRefresh: ReturnType<typeof vi.fn>;
    logOut: ReturnType<typeof vi.fn>;
  };
  let mockMeGQL: { fetch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockOAuthService = {
      initCodeFlow: vi.fn(),
      configure: vi.fn(),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(true),
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      setupAutomaticSilentRefresh: vi.fn(),
      logOut: vi.fn(),
    };
    mockMeGQL = { fetch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: MeGQL, useValue: mockMeGQL },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  describe('login()', () => {
    it('should call initCodeFlow with kc_idp_hint when idpHint is provided', () => {
      service.login('google');
      expect(mockOAuthService.initCodeFlow).toHaveBeenCalledWith('', {
        kc_idp_hint: 'google',
      });
    });

    it('should call initCodeFlow without args when no idpHint is provided', () => {
      service.login();
      expect(mockOAuthService.initCodeFlow).toHaveBeenCalledWith();
    });
  });

  describe('init() e2e bypass', () => {
    afterEach(() => {
      delete window.__E2E_USER__;
    });

    it('seeds currentUser and skips OIDC + me query when window.__E2E_USER__ is set', async () => {
      const e2eUser = {
        __typename: 'User' as const,
        id: 'e2e-1',
        email: 'e2e@test.local',
        name: 'E2E User',
        picture: null,
      };
      window.__E2E_USER__ = e2eUser;

      await service.init();

      expect(service.currentUser()).toEqual(e2eUser);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isLoading()).toBe(false);
      expect(mockOAuthService.configure).not.toHaveBeenCalled();
      expect(
        mockOAuthService.loadDiscoveryDocumentAndTryLogin
      ).not.toHaveBeenCalled();
      expect(mockMeGQL.fetch).not.toHaveBeenCalled();
    });

    it('runs the normal OIDC flow when window.__E2E_USER__ is absent', async () => {
      await service.init();

      expect(mockOAuthService.configure).toHaveBeenCalled();
      expect(
        mockOAuthService.loadDiscoveryDocumentAndTryLogin
      ).toHaveBeenCalled();
    });
  });

  describe('init() resilience', () => {
    it('resolves without throwing when OIDC discovery fails', async () => {
      mockOAuthService.loadDiscoveryDocumentAndTryLogin.mockRejectedValue(
        new Error('Keycloak unreachable')
      );

      // init() is wired into provideAppInitializer — it must not reject, or
      // Angular bootstrap blocks and the app never renders.
      await expect(service.init()).resolves.toBeUndefined();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.isLoading()).toBe(false);
      expect(service.error()).toContain('unavailable');
      expect(
        mockOAuthService.setupAutomaticSilentRefresh
      ).not.toHaveBeenCalled();
    });
  });
});
