import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import type { LucideIconData } from 'lucide-angular';
import {
  LucideAngularModule,
  House,
  Wallet,
  List,
  CalendarDays,
} from 'lucide-angular';
import { AvatarComponent } from '../../ui/avatar/avatar.component';
import { ListItemDirective } from '../../ui/list-item.directive';
import { AuthService } from '../../auth/auth.service';

interface Tab {
  readonly path: string;
  readonly icon: LucideIconData;
  readonly label: string;
}

@Component({
  selector: 'app-side-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    AvatarComponent,
    ListItemDirective,
  ],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
})
export class SideNavComponent {
  protected readonly tabs: readonly Tab[] = [
    { path: '/app/home', icon: House, label: 'Home' },
    { path: '/app/budget', icon: Wallet, label: 'Budget' },
    { path: '/app/lists', icon: List, label: 'Lists' },
    { path: '/app/calendar', icon: CalendarDays, label: 'Calendar' },
  ];

  private readonly authService = inject(AuthService);
  protected readonly initials = this.authService.initials;
  protected readonly pictureUrl = this.authService.pictureUrl;
  protected readonly displayName = this.authService.displayName;
}
