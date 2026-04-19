import { Component, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { PageContainerComponent } from '../ui/page-container/page-container.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PageContainerComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly authService = inject(AuthService);

  protected get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  protected readonly userName = this.authService.displayName;
}
