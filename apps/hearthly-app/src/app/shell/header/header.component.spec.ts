import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { computed, signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { LucideAngularModule } from 'lucide-angular';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../auth/auth.service';
import { NavigationHistoryService } from '../navigation-history.service';

function authStub() {
  return {
    initials: signal('MR'),
    pictureUrl: signal(null),
    displayName: signal('Matthias'),
    currentUser: signal({ email: 'x@y.z' }),
    isAuthenticated: computed(() => true),
    isLoading: computed(() => false),
    error: signal(null),
  } as unknown as AuthService;
}

function baseProviders(canGoBack = false) {
  return [
    { provide: AuthService, useValue: authStub() },
    {
      provide: NavigationHistoryService,
      useValue: {
        canGoBack: signal(canGoBack),
      } as unknown as NavigationHistoryService,
    },
    { provide: Location, useValue: { back: vi.fn() } },
    { provide: Router, useValue: { navigateByUrl: vi.fn() } },
    { provide: ActivatedRoute, useValue: {} },
  ];
}

describe('HeaderComponent', () => {
  it('hides the back button when showBack is false', () => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent, LucideAngularModule],
      providers: baseProviders(false),
    });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-testid="header-back"]')
    ).toBeNull();
  });

  it('shows the back button when showBack is true and calls Location.back()', () => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent, LucideAngularModule],
      providers: baseProviders(true),
    });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentRef.setInput('showBack', true);
    fixture.detectChanges();

    const location = TestBed.inject(Location) as unknown as {
      back: ReturnType<typeof vi.fn>;
    };
    const router = TestBed.inject(Router) as unknown as {
      navigateByUrl: ReturnType<typeof vi.fn>;
    };
    const btn = fixture.nativeElement.querySelector(
      '[data-testid="header-back"]'
    ) as HTMLButtonElement;
    btn.click();
    expect(location.back).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('falls back to /app/home when canGoBack() is false', () => {
    TestBed.configureTestingModule({
      imports: [HeaderComponent, LucideAngularModule],
      providers: baseProviders(false),
    });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.componentRef.setInput('showBack', true);
    fixture.detectChanges();

    const location = TestBed.inject(Location) as unknown as {
      back: ReturnType<typeof vi.fn>;
    };
    const router = TestBed.inject(Router) as unknown as {
      navigateByUrl: ReturnType<typeof vi.fn>;
    };
    (
      fixture.nativeElement.querySelector(
        '[data-testid="header-back"]'
      ) as HTMLButtonElement
    ).click();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/home');
    expect(location.back).not.toHaveBeenCalled();
  });
});
