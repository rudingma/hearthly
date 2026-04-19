import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { BrandMarkComponent } from '../../ui/brand-mark/brand-mark.component';
import { ButtonDirective } from '../../ui/button.directive';
import { AuthService } from '../../auth/auth.service';
import { NavigationHistoryService } from '../navigation-history.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    LucideAngularModule,
    AvatarComponent,
    BrandMarkComponent,
    ButtonDirective,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  /**
   * Header title text.
   *
   * **In-shell routes:** do NOT bind `[heading]` directly. Set the
   * standard `title` key on the route in `app.routes.ts`; the shell's
   * `HearthlyTitleStrategy` publishes the current value to a signal which
   * `ResponsiveShellComponent` binds to this input. A literal bound from
   * an in-shell page template will be overwritten on navigation.
   *
   * **Outside-shell routes** (welcome, account) render their own
   * `<app-header>` and should bind `[heading]` directly.
   *
   * Named `heading` (not `title`) to avoid the HTML global `title`
   * attribute collision on `<app-header title="…">`.
   */
  readonly heading = input<string>('Hearthly');

  /** Render a back-arrow in the leading slot. Outside-shell pages set
   * this `true`; in-shell pages leave it default (`false`) and the
   * leading slot is filled with the brand mark instead. */
  readonly showBack = input<boolean>(false);

  private readonly history = inject(NavigationHistoryService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);

  protected readonly canGoBack = this.history.canGoBack;
  protected readonly initials = this.authService.initials;
  protected readonly pictureUrl = this.authService.pictureUrl;

  // Icon objects bound via [img] in the template — `lucide-angular`'s
  // documented standalone pattern. Avoids the name-string lookup path.
  protected readonly ArrowLeftIcon = ArrowLeft;

  protected back(): void {
    if (this.canGoBack()) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/app/home');
    }
  }
}
