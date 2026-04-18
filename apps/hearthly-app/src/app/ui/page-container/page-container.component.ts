import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-page-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-page-container',
    '[class.app-page-container--constrained]': 'mode() === "constrained"',
  },
  template: `<ng-content />`,
})
export class PageContainerComponent {
  readonly mode = input<'standard' | 'constrained'>('standard');
}
