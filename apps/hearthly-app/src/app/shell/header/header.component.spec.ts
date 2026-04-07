import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../auth/auth.service';
import type { User } from '../../auth/auth.service';

function createMockAuthService(user: User | null = { name: 'Matthias Rudingsdorfer', email: 'dev@hearthly.dev', id: '1' }) {
  const currentUser = signal(user);
  return {
    currentUser,
    isAuthenticated: computed(() => currentUser() !== null),
    isLoading: signal(false),
    error: signal<string | null>(null),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
    init: vi.fn(),
  };
}

describe('HeaderComponent', () => {
  it('should create', async () => {
    const mockAuth = createMockAuthService();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }, provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeaderComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display user initials from full name', async () => {
    const mockAuth = createMockAuthService({ name: 'Matthias Rudingsdorfer', email: 'dev@hearthly.dev', id: '1' });
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }, provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.initials()).toBe('MR');
  });

  it('should handle single-word name', async () => {
    const mockAuth = createMockAuthService({ name: 'Matthias', email: 'dev@hearthly.dev', id: '1' });
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }, provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.initials()).toBe('M');
  });

  it('should return empty string when no user', async () => {
    const mockAuth = createMockAuthService(null);
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [{ provide: AuthService, useValue: mockAuth }, provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.initials()).toBe('');
  });
});
