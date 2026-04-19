import { Component } from '@angular/core';
import { LucideAngularModule, List } from 'lucide-angular';
import { PageContainerComponent } from '../ui/page-container/page-container.component';

@Component({
  selector: 'app-lists',
  standalone: true,
  imports: [PageContainerComponent, LucideAngularModule],
  template: `
    <app-page-container>
      <div class="placeholder-page">
        <lucide-icon [img]="ListIcon" [size]="48" />
        <h2>Lists</h2>
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
        color: var(--color-stone-muted);
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
export class ListsComponent {
  protected readonly ListIcon = List;
}
