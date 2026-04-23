import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { PageContainerComponent } from '../../ui/page-container/page-container.component';
import { ButtonDirective } from '../../ui/button.directive';
import { HouseholdMembershipService } from '../household-membership.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-household-error',
  standalone: true,
  imports: [PageContainerComponent, ButtonDirective],
  templateUrl: './app-error.component.html',
  styleUrl: './app-error.component.scss',
})
export class AppErrorComponent {
  private readonly householdService = inject(HouseholdMembershipService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isRetrying = signal(false);
  readonly hasRetried = signal(false);

  readonly failurePlane = computed<'auth' | 'household'>(() =>
    this.authService.authState().state === 'error' ? 'auth' : 'household',
  );

  async onRetry(): Promise<void> {
    if (this.isRetrying()) return;
    this.isRetrying.set(true);
    try {
      if (this.failurePlane() === 'auth') {
        await this.authService.retry();
        const s = this.authService.authState().state;
        if (s === 'authenticated') {
          await this.router.navigateByUrl('/app/home');
        } else if (s === 'unauthenticated') {
          // IdP recovered but user isn't signed in — send them to welcome
          // where the Sign In button lives. Round-5 review fix.
          await this.router.navigateByUrl('/');
        } else {
          this.hasRetried.set(true);
        }
      } else {
        await this.householdService.retry();
        if (this.householdService.status() === 'ready') {
          await this.router.navigateByUrl('/app/home');
        } else {
          this.hasRetried.set(true);
        }
      }
    } finally {
      this.isRetrying.set(false);
    }
  }
}
