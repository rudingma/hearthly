import { TestBed } from '@angular/core/testing';
import { signal, computed } from '@angular/core';
import { HomeComponent } from './home.component';
import { AuthService } from '../auth/auth.service';

describe('HomeComponent', () => {
  const currentUser = signal({ name: 'Matthias', email: 'dev@hearthly.dev', id: '1' });
  const mockAuthService = {
    currentUser,
    isAuthenticated: computed(() => true),
    isLoading: signal(false),
    error: signal<string | null>(null),
    initials: computed(() => {
      const name = currentUser()?.name;
      if (!name) return '';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }),
    login: vi.fn(),
    logout: vi.fn(),
    retry: vi.fn(),
    init: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should say Good morning before noon', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.greeting).toBe('Good morning');
  });

  it('should say Good afternoon between noon and 6pm', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.greeting).toBe('Good afternoon');
  });

  it('should say Good evening after 6pm', () => {
    vi.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.greeting).toBe('Good evening');
  });

  it('should display user name', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Matthias');
  });
});
