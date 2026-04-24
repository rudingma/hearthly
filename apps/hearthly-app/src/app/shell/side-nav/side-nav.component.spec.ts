import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { LucideAngularModule } from 'lucide-angular';
import { SideNavComponent } from './side-nav.component';
import { AuthService } from '../../auth/auth.service';
import { createMockAuthService } from '../../auth/auth.service.test-helpers';

describe('SideNavComponent', () => {
  it('renders the Home primary nav item + Account footer', () => {
    const { service } = createMockAuthService({
      state: 'authenticated',
      user: {
        name: 'Matthias Rudingsdorfer',
        email: 'x@y.z',
        id: '1',
        picture: null,
      },
    });
    TestBed.configureTestingModule({
      imports: [SideNavComponent, LucideAngularModule],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: service,
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
