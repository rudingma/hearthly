import { Directive, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

@Directive({
  selector: 'button[appButton], a[appButton]',
  standalone: true,
  host: {
    class: 'app-button',
    '[class.app-button--primary]': 'variant() === "primary"',
    '[class.app-button--secondary]': 'variant() === "secondary"',
    '[class.app-button--ghost]': 'variant() === "ghost"',
    '[class.app-button--destructive]': 'variant() === "destructive"',
    '[class.app-button--full-width]': 'fullWidth()',
  },
})
export class ButtonDirective {
  readonly variant = input<ButtonVariant>('primary');
  readonly fullWidth = input<boolean>(false);
}
