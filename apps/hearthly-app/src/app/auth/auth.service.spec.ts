import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { OAuthService, type OAuthEvent } from 'angular-oauth2-oidc';
import { Apollo } from 'apollo-angular';
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
    stopAutomaticRefresh: ReturnType<typeof vi.fn>;
    logOut: ReturnType<typeof vi.fn>;
    events: Subject<OAuthEvent>;
  };
  let mockMeGQL: { fetch: ReturnType<typeof vi.fn> };
  let mockApollo: { client: { clearStore: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    mockOAuthService = {
      initCodeFlow: vi.fn(),
      configure: vi.fn(),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(true),
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      setupAutomaticSilentRefresh: vi.fn(),
      stopAutomaticRefresh: vi.fn(),
      logOut: vi.fn(),
      events: new Subject<OAuthEvent>(),
    };
    mockMeGQL = { fetch: vi.fn() };
    mockApollo = {
      client: { clearStore: vi.fn().mockResolvedValue(undefined) },
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: MeGQL, useValue: mockMeGQL },
        { provide: Apollo, useValue: mockApollo },
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

describe('AuthService.logout (four-step teardown + refresh race guard)', () => {
  let events: Subject<OAuthEvent>;
  let oauth: {
    stopAutomaticRefresh: ReturnType<typeof vi.fn>;
    logOut: ReturnType<typeof vi.fn>;
    configure: ReturnType<typeof vi.fn>;
    events: Subject<OAuthEvent>;
    hasValidAccessToken: ReturnType<typeof vi.fn>;
    loadDiscoveryDocumentAndTryLogin: ReturnType<typeof vi.fn>;
    setupAutomaticSilentRefresh: ReturnType<typeof vi.fn>;
  };
  let apollo: { client: { clearStore: ReturnType<typeof vi.fn> } };
  let meGQL: { fetch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    events = new Subject<OAuthEvent>();
    oauth = {
      stopAutomaticRefresh: vi.fn(),
      logOut: vi.fn(),
      configure: vi.fn(),
      events,
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(undefined),
      setupAutomaticSilentRefresh: vi.fn(),
    };
    apollo = { client: { clearStore: vi.fn().mockResolvedValue(undefined) } };
    meGQL = { fetch: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauth },
        { provide: Apollo, useValue: apollo },
        { provide: MeGQL, useValue: meGQL },
      ],
    });
  });

  it('calls stopAutomaticRefresh, clears user, awaits clearStore, then logOut — in order', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    const order: string[] = [];
    oauth.stopAutomaticRefresh.mockImplementation(() => order.push('stop'));
    apollo.client.clearStore.mockImplementation(async () => {
      order.push('clearStore');
    });
    oauth.logOut.mockImplementation(() => order.push('logOut'));

    await svc.logout();

    expect(order).toEqual(['stop', 'clearStore', 'logOut']);
    expect(svc.currentUser()).toBeNull();
  });

  it('proceeds with oauthService.logOut() even when clearStore rejects', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    apollo.client.clearStore.mockRejectedValueOnce(
      new Error('cache teardown failed')
    );
    await svc.logout();
    expect(oauth.logOut).toHaveBeenCalled();
    expect(svc.currentUser()).toBeNull();
  });

  it('scrubs late token_received events while logging out', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    oauth.stopAutomaticRefresh.mockImplementation(() => {
      events.next({ type: 'token_received' } as OAuthEvent);
    });
    await svc.logout();
    expect(oauth.logOut).toHaveBeenCalledTimes(2);
  });

  it('also scrubs late silently_refreshed events while logging out (silent-refresh config)', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();

    oauth.stopAutomaticRefresh.mockImplementation(() => {
      events.next({ type: 'silently_refreshed' } as OAuthEvent);
    });

    await svc.logout();

    // logOut called twice: once inside the race-guard handler, once as step 4.
    expect(oauth.logOut).toHaveBeenCalledTimes(2);
  });

  it('scrubs token_received events that arrive AFTER oauthService.logOut() returns (redirect-window race)', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();

    await svc.logout();

    // Simulate the browser still alive after logOut() returned synchronously
    // but before the redirect fully tears down the SPA.
    events.next({ type: 'token_received' } as OAuthEvent);

    // Two calls total: once as the last step of logout(), once by the
    // race-guard scrubbing the late event.
    expect(oauth.logOut).toHaveBeenCalledTimes(2);
  });

  it('does not scrub token_received events when not logging out', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    events.next({ type: 'token_received' } as OAuthEvent);
    expect(oauth.logOut).not.toHaveBeenCalled();
  });
});

describe('AuthService.authState — derived signal', () => {
  let events: Subject<OAuthEvent>;
  let oauth: any;
  let apollo: any;

  beforeEach(() => {
    events = new Subject<OAuthEvent>();
    oauth = {
      stopAutomaticRefresh: vi.fn(),
      logOut: vi.fn(),
      configure: vi.fn(),
      events,
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(undefined),
      setupAutomaticSilentRefresh: vi.fn(),
    };
    apollo = { client: { clearStore: vi.fn().mockResolvedValue(undefined) } };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauth },
        { provide: Apollo, useValue: apollo },
        { provide: MeGQL, useValue: { fetch: vi.fn() } },
      ],
    });
  });

  it('starts in loading state', () => {
    const svc = TestBed.inject(AuthService);
    expect(svc.authState().state).toBe('loading');
  });

  it('transitions to unauthenticated after init when no token', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    expect(svc.authState().state).toBe('unauthenticated');
  });

  it('transitions to error when AuthService.init() fails', async () => {
    oauth.loadDiscoveryDocumentAndTryLogin.mockRejectedValueOnce(
      new Error('idp down')
    );
    const svc = TestBed.inject(AuthService);
    await svc.init();
    expect(svc.authState().state).toBe('error');
  });

  it('error state is NOT leaked through to authenticated once user loads', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    svc.error.set(null);
    (svc as any).currentUser.set({ id: 'u1', email: 'x' } as any);
    expect(svc.authState().state).toBe('authenticated');
  });
});

describe('AuthService.retry — bootstrap recovery', () => {
  let events: Subject<OAuthEvent>;
  let oauth: any;
  let apollo: any;
  let meGQL: { fetch: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    events = new Subject<OAuthEvent>();
    oauth = {
      stopAutomaticRefresh: vi.fn(),
      logOut: vi.fn(),
      configure: vi.fn(),
      events,
      hasValidAccessToken: vi.fn().mockReturnValue(false),
      loadDiscoveryDocumentAndTryLogin: vi.fn().mockResolvedValue(undefined),
      setupAutomaticSilentRefresh: vi.fn(),
    };
    apollo = { client: { clearStore: vi.fn().mockResolvedValue(undefined) } };
    meGQL = {
      fetch: vi.fn().mockReturnValue(
        of({
          data: {
            me: {
              __typename: 'User',
              id: 'u1',
              email: 'x',
              name: null,
              picture: null,
            },
          },
        })
      ),
    };
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: OAuthService, useValue: oauth },
        { provide: Apollo, useValue: apollo },
        { provide: MeGQL, useValue: meGQL },
      ],
    });
  });

  it('recovers from a bootstrap failure on retry', async () => {
    oauth.loadDiscoveryDocumentAndTryLogin.mockRejectedValueOnce(
      new Error('idp down')
    );
    const svc = TestBed.inject(AuthService);
    await svc.init();
    expect(svc.authState().state).toBe('error');

    oauth.loadDiscoveryDocumentAndTryLogin.mockResolvedValueOnce(undefined);
    oauth.hasValidAccessToken.mockReturnValueOnce(true);
    await svc.retry();

    expect(oauth.loadDiscoveryDocumentAndTryLogin).toHaveBeenCalledTimes(2);
    expect(meGQL.fetch).toHaveBeenCalled();
    expect(svc.authState().state).toBe('authenticated');
  });

  it('stays in error state when retry also fails', async () => {
    oauth.loadDiscoveryDocumentAndTryLogin.mockRejectedValue(
      new Error('still down')
    );
    const svc = TestBed.inject(AuthService);
    await svc.init();
    expect(svc.authState().state).toBe('error');
    await svc.retry();
    expect(svc.authState().state).toBe('error');
  });

  it('isLoading flips to true during retry and back to false when done', async () => {
    const svc = TestBed.inject(AuthService);
    await svc.init();
    let observedLoading = false;
    oauth.loadDiscoveryDocumentAndTryLogin.mockImplementationOnce(async () => {
      observedLoading = svc.isLoading();
    });
    await svc.retry();
    expect(observedLoading).toBe(true);
    expect(svc.isLoading()).toBe(false);
  });
});
