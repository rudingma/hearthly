import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageContainerComponent } from '../../ui/page-container/page-container.component';
import { ButtonDirective } from '../../ui/button.directive';
import { HouseholdMembershipService } from '../household-membership.service';
import { AuthService } from '../../auth/auth.service';

export type RetryPhase =
  | { phase: 'idle' }
  | { phase: 'retrying' }
  | { phase: 'failed' };

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

  readonly retryPhase = signal<RetryPhase>({ phase: 'idle' });

  // Display-layer selectors — templates read these; logic reads retryPhase().
  protected readonly isRetrying = computed(
    () => this.retryPhase().phase === 'retrying'
  );
  protected readonly hasFailed = computed(
    () => this.retryPhase().phase === 'failed'
  );

  readonly failurePlane = computed<'auth' | 'household'>(() =>
    this.authService.authState().state === 'error' ? 'auth' : 'household'
  );

  async onRetry(): Promise<void> {
    if (this.retryPhase().phase === 'retrying') return;
    this.retryPhase.set({ phase: 'retrying' });
    try {
      if (this.failurePlane() === 'auth') {
        await this.authService.retry();
        const s = this.authService.authState().state;
        if (s === 'authenticated') {
          await this.router.navigateByUrl('/app/home');
          return;
        }
        if (s === 'unauthenticated') {
          await this.router.navigateByUrl('/');
          return;
        }
        this.retryPhase.set({ phase: 'failed' });
      } else {
        await this.householdService.retry();
        if (this.householdService.state().status === 'ready') {
          await this.router.navigateByUrl('/app/home');
          return;
        }
        this.retryPhase.set({ phase: 'failed' });
      }
    } catch (err) {
      console.error('AppError: retry path threw', err);
      this.retryPhase.set({ phase: 'failed' });
    }
  }
}
