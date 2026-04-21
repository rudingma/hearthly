import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { computed, signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { LucideAngularModule } from 'lucide-angular';
import { SideNavComponent } from './side-nav.component';
import { AuthService } from '../../auth/auth.service';

describe('SideNavComponent', () => {
  it('renders the Home primary nav item + Account footer', () => {
    TestBed.configureTestingModule({
      imports: [SideNavComponent, LucideAngularModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            initials: signal('MR'),
            pictureUrl: signal(null),
            displayName: signal('Matthias'),
            currentUser: signal({ email: 'x@y.z' }),
            isAuthenticated: computed(() => true),
            isLoading: computed(() => false),
            error: signal(null),
          } as unknown as AuthService,
        },
      ],
    });
    const fixture = TestBed.createComponent(SideNavComponent);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('a[appListItem]');
    expect(links.length).toBe(2);
    const nav = fixture.nativeElement.querySelector('nav');
    expect(nav!.getAttribute('aria-label')).toBe('Primary');
  });
});
