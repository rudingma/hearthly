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

  beforeEach(() => {
    mockOAuthService = {
      initCodeFlow: vi.fn(),
      configure: vi.fn(),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(true),
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      setupAutomaticSilentRefresh: vi.fn(),
      logOut: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: MeGQL, useValue: { fetch: vi.fn() } },
      ],
    });

    service = TestBed.inject(AuthService);
  });

  describe('login()', () => {
    it('should call initCodeFlow with kc_idp_hint when idpHint is provided', () => {
      service.login('google');
      expect(mockOAuthService.initCodeFlow).toHaveBeenCalledWith('', { kc_idp_hint: 'google' });
    });

    it('should call initCodeFlow without args when no idpHint is provided', () => {
      service.login();
      expect(mockOAuthService.initCodeFlow).toHaveBeenCalledWith();
    });
  });
});
