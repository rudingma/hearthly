import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import type { ActivatedRouteSnapshot } from '@angular/router';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { DESKTOP_MEDIA } from '../ui/breakpoints';
import { BottomTabBarComponent } from './bottom-tab-bar/bottom-tab-bar.component';
import { HeaderComponent } from './header/header.component';
import { SideNavComponent } from './side-nav/side-nav.component';

@Component({
  selector: 'app-responsive-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    HeaderComponent,
    BottomTabBarComponent,
    SideNavComponent,
  ],
  templateUrl: './responsive-shell.component.html',
  styleUrl: './responsive-shell.component.scss',
})
export class ResponsiveShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isDesktop = toSignal(
    this.breakpointObserver.observe(DESKTOP_MEDIA).pipe(map((s) => s.matches)),
    { initialValue: false }
  );

  // Derives the current page title from the deepest matched route's
  // `data.title`. Updates on every NavigationEnd so the header stays in
  // sync with the active tab.
  protected readonly activeTitle = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.resolveTitle(this.route.snapshot)),
      startWith(this.resolveTitle(this.route.snapshot))
    ),
    { initialValue: 'Hearthly' }
  );

  private resolveTitle(snapshot: ActivatedRouteSnapshot): string {
    let current: ActivatedRouteSnapshot | null = snapshot;
    while (current?.firstChild) current = current.firstChild;
    return (current?.data?.['title'] as string | undefined) ?? 'Hearthly';
  }
}
