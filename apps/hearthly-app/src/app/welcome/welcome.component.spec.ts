import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { WelcomeComponent } from './welcome.component';
import { AuthService } from '../auth/auth.service';

describe('WelcomeComponent', () => {
  const mockAuthService = {
    currentUser: signal(null),
    isAuthenticated: computed(() => false),
    isLoading: signal(false),
    error: signal<string | null>(null),
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
});
