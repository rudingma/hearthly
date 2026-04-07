import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { WelcomeComponent } from './welcome.component';
import { AuthService } from '../auth/auth.service';

describe('WelcomeComponent', () => {
  const mockAuthService = {
    currentUser: signal(null),
    isAuthenticated: computed(() => false),
    isLoading: signal(false),
    error: signal<string | null>(null),
    initials: computed(() => ''),
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

  it('should call authService.login() when sign in is clicked', () => {
    const fixture = TestBed.createComponent(WelcomeComponent);
    fixture.detectChanges();
    const button: HTMLElement = fixture.nativeElement.querySelector('ion-button[data-testid="sign-in-button"]');
    button.click();
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('should redirect to /app/home if already authenticated', () => {
    const authenticatedMock = {
      currentUser: signal({ name: 'Test', email: 'test@test.com', id: '1' }),
      isAuthenticated: computed(() => true),
      isLoading: signal(false),
      error: signal<string | null>(null),
      initials: computed(() => 'T'),
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
