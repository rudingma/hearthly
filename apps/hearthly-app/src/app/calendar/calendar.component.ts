import { Component } from '@angular/core';
import { LucideAngularModule, CalendarDays } from 'lucide-angular';
import { PageContainerComponent } from '../ui/page-container/page-container.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [PageContainerComponent, LucideAngularModule],
  template: `
    <app-page-container>
      <div class="placeholder-page">
        <lucide-icon [img]="CalendarDaysIcon" [size]="48" />
        <h2>Calendar</h2>
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
export class CalendarComponent {
  protected readonly CalendarDaysIcon = CalendarDays;
}
