import { TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { LucideAngularModule } from 'lucide-angular';
import { ResponsiveShellComponent } from './responsive-shell.component';
import { AuthService } from '../auth/auth.service';
import { NavigationHistoryService } from './navigation-history.service';
import { createMockAuthService } from '../auth/auth.service.test-helpers';

function baseProviders(matches: boolean) {
  const { service } = createMockAuthService({
    state: 'authenticated',
    user: {
      name: 'Matthias Rudingsdorfer',
      email: 'x@y.z',
      id: '1',
      picture: null,
    },
  });
  return [
    provideRouter([]),
    { provide: AuthService, useValue: service },
    {
      provide: NavigationHistoryService,
      useValue: {
        canGoBack: signal(false),
      } as unknown as NavigationHistoryService,
    },
    {
      provide: BreakpointObserver,
      useValue: { observe: () => of({ matches }) },
    },
  ];
}

describe('ResponsiveShellComponent', () => {
  it('renders the mobile layout below 993px', () => {
    TestBed.configureTestingModule({
      imports: [ResponsiveShellComponent, LucideAngularModule],
      providers: baseProviders(false),
    });
    const fixture = TestBed.createComponent(ResponsiveShellComponent);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.shell--mobile')
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('app-bottom-tab-bar')
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-side-nav')).toBeNull();
  });

  it('renders the desktop layout at or above 993px', () => {
    TestBed.configureTestingModule({
      imports: [ResponsiveShellComponent, LucideAngularModule],
      providers: baseProviders(true),
    });
    const fixture = TestBed.createComponent(ResponsiveShellComponent);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.shell--desktop')
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-side-nav')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('app-bottom-tab-bar')
    ).toBeNull();
  });

  it('always renders a single <main tabindex=-1>', () => {
    TestBed.configureTestingModule({
      imports: [ResponsiveShellComponent, LucideAngularModule],
      providers: baseProviders(false),
    });
    const fixture = TestBed.createComponent(ResponsiveShellComponent);
    fixture.detectChanges();
    const mains = fixture.nativeElement.querySelectorAll('main[tabindex="-1"]');
    expect(mains.length).toBe(1);
  });
});
