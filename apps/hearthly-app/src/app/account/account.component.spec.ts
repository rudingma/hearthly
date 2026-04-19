import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { AccountComponent } from './account.component';
import { AuthService } from '../auth/auth.service';
import { NavigationHistoryService } from '../shell/navigation-history.service';

describe('AccountComponent', () => {
  const currentUser = signal<{
    name: string;
    email: string;
    id: string;
    picture?: string | null;
  } | null>({
    name: 'Matthias Rudingsdorfer',
    email: 'dev@hearthly.dev',
    id: '1',
  });
  const mockAuthService = {
    currentUser,
    isAuthenticated: computed(() => true),
    isLoading: signal(false),
    error: signal<string | null>(null),
    displayName: computed(() => currentUser()?.name ?? ''),
    initials: computed(() => 'MR'),
    pictureUrl: computed(() => currentUser()?.picture ?? null),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
    init: vi.fn(),
  };
  const mockHistory = { canGoBack: signal(true) };

  beforeEach(async () => {
    vi.clearAllMocks();
    currentUser.set({
      name: 'Matthias Rudingsdorfer',
      email: 'dev@hearthly.dev',
      id: '1',
    });
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: NavigationHistoryService, useValue: mockHistory },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display user name and email', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Matthias Rudingsdorfer');
    expect(el.textContent).toContain('dev@hearthly.dev');
  });

  it('should call logout when sign out is clicked', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    const button: HTMLElement = fixture.nativeElement.querySelector(
      'button[data-testid="sign-out-button"]'
    );
    button.click();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('renders <main tabindex="-1"> wrapper (outside-shell route contract)', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main[tabindex="-1"]');
    expect(main).not.toBeNull();
  });
});
