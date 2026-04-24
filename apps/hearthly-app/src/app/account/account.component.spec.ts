import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountComponent } from './account.component';
import { AuthService } from '../auth/auth.service';
import { NavigationHistoryService } from '../shell/navigation-history.service';
import { createMockAuthService } from '../auth/auth.service.test-helpers';
import { signal } from '@angular/core';

describe('AccountComponent', () => {
  const testUser = {
    name: 'Matthias Rudingsdorfer',
    email: 'dev@hearthly.dev',
    id: '1',
    picture: null as string | null,
  };

  let authMock: ReturnType<typeof createMockAuthService>;
  const mockHistory = { canGoBack: signal(true) };

  beforeEach(async () => {
    vi.clearAllMocks();
    authMock = createMockAuthService({
      state: 'authenticated',
      user: testUser,
    });
    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        { provide: AuthService, useValue: authMock.service },
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
    expect(authMock.service.logout).toHaveBeenCalled();
  });

  it('renders <main tabindex="-1"> wrapper (outside-shell route contract)', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main[tabindex="-1"]');
    expect(main).not.toBeNull();
  });
});
