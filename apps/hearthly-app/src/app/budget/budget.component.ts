import { Component } from '@angular/core';
import { LucideAngularModule, Wallet } from 'lucide-angular';
import { PageContainerComponent } from '../ui/page-container/page-container.component';

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [PageContainerComponent, LucideAngularModule],
  template: `
    <app-page-container>
      <div class="placeholder-page">
        <lucide-icon [img]="WalletIcon" [size]="48" />
        <h2>Budget</h2>
        <p>Coming soon</p>
      </div>
    </app-page-container>
  `,
  styles: [
    `
      .placeholder-page {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
        color: var(--color-text-body-muted);
      }
      h2 {
        margin: 16px 0 8px;
        font-size: 32px;
        font-weight: 700;
        color: var(--color-warm-dark);
      }
    `,
  ],
})
export class BudgetComponent {
  protected readonly WalletIcon = Wallet;
}
