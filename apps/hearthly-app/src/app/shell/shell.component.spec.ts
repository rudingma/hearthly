import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { ShellComponent } from './shell.component';
import { AuthService } from '../auth/auth.service';

describe('ShellComponent', () => {
  beforeEach(async () => {
    // ion-split-pane uses window.matchMedia which is not available in the test environment
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    const mockAuthService = {
      currentUser: signal({ name: 'Test User', email: 'test@test.com', id: '1' }),
      isAuthenticated: computed(() => true),
      isLoading: signal(false),
      error: signal<string | null>(null),
      initials: computed(() => 'TU'),
      login: vi.fn(),
      logout: vi.fn(),
      retry: vi.fn(),
      init: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        provideRouter([]),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render 4 tab buttons', () => {
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const tabs = fixture.nativeElement.querySelectorAll('ion-tab-button');
    expect(tabs.length).toBe(4);
  });
});
