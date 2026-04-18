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
import { ButtonDirective } from '../../ui/button.directive';
import { AuthService } from '../../auth/auth.service';
import { NavigationHistoryService } from '../navigation-history.service';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LucideAngularModule, AvatarComponent, ButtonDirective],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  /** Named `heading` rather than `title` — the HTML `title` global attribute would otherwise create an ambiguous binding on <app-header title="…">. */
  readonly heading = input<string>('Hearthly');
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
