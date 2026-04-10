import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { WelcomeComponent } from './welcome.component';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';

describe('WelcomeComponent', () => {
  const mockAuthService = {
    currentUser: signal(null),
    isAuthenticated: computed(() => false),
    isLoading: signal(false),
    error: signal<string | null>(null),
    initials: computed(() => ''),
    displayName: computed(() => ''),
    pictureUrl: computed(() => null),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
    init: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WelcomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should call authService.login("google") when Google sign-in is clicked', () => {
    const fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
    const button: HTMLElement = fixture.nativeElement.querySelector('[data-testid="sign-in-google"]');
    button.click();
    expect(mockAuthService.login).toHaveBeenCalledWith('google');
  });

  it('should show dev fallback button when enablePasswordAuth is true', () => {
    const original = environment.enablePasswordAuth;
    (environment as any).enablePasswordAuth = true;
    try {
      const fixture = TestBed.createComponent(WelcomeComponent);
      fixture.detectChanges();
      const button: HTMLElement = fixture.nativeElement.querySelector('[data-testid="sign-in-password"]');
      expect(button).toBeTruthy();
    } finally {
      (environment as any).enablePasswordAuth = original;
    }
  });

  it('should hide dev fallback button when enablePasswordAuth is false', () => {
    const original = environment.enablePasswordAuth;
    (environment as any).enablePasswordAuth = false;
    try {
      const fixture = TestBed.createComponent(WelcomeComponent);
      fixture.detectChanges();
      const button: HTMLElement = fixture.nativeElement.querySelector('[data-testid="sign-in-password"]');
      expect(button).toBeFalsy();
    } finally {
      (environment as any).enablePasswordAuth = original;
    }
  });

  it('should call authService.login() without args when dev fallback is clicked', () => {
    const original = environment.enablePasswordAuth;
    (environment as any).enablePasswordAuth = true;
    try {
      const fixture = TestBed.createComponent(WelcomeComponent);
      fixture.detectChanges();
      const button: HTMLElement = fixture.nativeElement.querySelector('[data-testid="sign-in-password"]');
      button.click();
      expect(mockAuthService.login).toHaveBeenCalledWith();
    } finally {
      (environment as any).enablePasswordAuth = original;
    }
  });

  it('should redirect to /app/home if already authenticated', () => {
    const authenticatedMock = {
      currentUser: signal({ name: 'Test', email: 'test@test.com', id: '1' }),
      isAuthenticated: computed(() => true),
      isLoading: signal(false),
      error: signal<string | null>(null),
      initials: computed(() => 'T'),
      displayName: computed(() => 'Test'),
      pictureUrl: computed(() => null),
      login: vi.fn(),
      logout: vi.fn(),
      retry: vi.fn(),
      init: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [WelcomeComponent],
      providers: [
        { provide: AuthService, useValue: authenticatedMock },
        provideRouter([]),
      ],
    });

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/app/home']);
  });
});
