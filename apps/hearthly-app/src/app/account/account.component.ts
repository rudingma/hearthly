import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  LucideAngularModule,
  Users,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-angular';
import { AuthService } from '../auth/auth.service';
import { AvatarComponent } from '../ui/avatar/avatar.component';
import { ButtonDirective } from '../ui/button.directive';
import { ListItemDirective } from '../ui/list-item.directive';
import { PageContainerComponent } from '../ui/page-container/page-container.component';
import { HeaderComponent } from '../shell/header/header.component';

@Component({
  selector: 'app-account',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HeaderComponent,
    PageContainerComponent,
    AvatarComponent,
    ButtonDirective,
    ListItemDirective,
    LucideAngularModule,
  ],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  private readonly authService = inject(AuthService);

  protected readonly userName = this.authService.displayName;
  protected readonly userEmail = computed(
    () => this.authService.currentUser()?.email ?? ''
  );
  protected readonly initials = this.authService.initials;
  protected readonly pictureUrl = this.authService.pictureUrl;

  protected readonly UsersIcon = Users;
  protected readonly SettingsIcon = Settings;
  protected readonly HelpCircleIcon = HelpCircle;
  protected readonly LogOutIcon = LogOut;

  protected signOut(): void {
    void this.authService.logout();
  }
}
