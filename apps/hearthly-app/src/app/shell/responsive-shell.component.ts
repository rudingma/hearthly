import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { map } from 'rxjs/operators';
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

  protected readonly isDesktop = toSignal(
    this.breakpointObserver.observe(DESKTOP_MEDIA).pipe(map((s) => s.matches)),
    { initialValue: false }
  );
}
