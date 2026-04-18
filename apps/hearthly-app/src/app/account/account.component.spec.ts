import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { AccountComponent } from './account.component';
import { AuthService } from '../auth/auth.service';

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
    displayName: computed(() => {
      const user = currentUser();
      if (!user) return '';
      return user.name || user.email.split('@')[0];
    }),
    initials: computed(() => {
      const name = currentUser()?.name;
      if (name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      const email = currentUser()?.email;
      if (email) return email[0].toUpperCase();
      return '';
    }),
    pictureUrl: computed(() => currentUser()?.picture ?? null),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
    init: vi.fn(),
  };

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
      'ion-button[data-testid="sign-out-button"]'
    );
    button.click();
    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should expose pictureUrl from auth service', () => {
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.pictureUrl()).toBeNull();
  });

  it('should display picture when user has one', async () => {
    currentUser.set({
      name: 'Matthias Rudingsdorfer',
      email: 'dev@hearthly.dev',
      id: '1',
      picture: 'https://lh3.googleusercontent.com/photo.jpg',
    });
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.pictureUrl()).toBe(
      'https://lh3.googleusercontent.com/photo.jpg'
    );
  });

  it('should fall back to initials when image fails to load', () => {
    currentUser.set({
      name: 'Matthias Rudingsdorfer',
      email: 'dev@hearthly.dev',
      id: '1',
      picture: 'https://lh3.googleusercontent.com/broken.jpg',
    });
    const fixture = TestBed.createComponent(AccountComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.imageError()).toBe(false);
    fixture.componentInstance.onImageError();
    expect(fixture.componentInstance.imageError()).toBe(true);
  });
});
