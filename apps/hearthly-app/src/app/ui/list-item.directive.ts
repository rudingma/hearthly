/**
 * Layout directive for list rows. Visual + a11y styling via host classes.
 *
 * Interactive rows MUST use `<a>` or `<button>` hosts so focus/hover/keyboard
 * handling and screen-reader semantics come from the native element. Do not
 * bind `(click)` on `<div>` or `<li>` hosts — it creates an unlabeled,
 * unfocusable div-button. No runtime check exists today; enforcement is via
 * code review. A lint rule is future work.
 */
import { Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appListItem]',
  standalone: true,
  host: {
    class: 'app-list-item',
    '[class.app-list-item--interactive]': 'isInteractive',
  },
})
export class ListItemDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  // tagName is set at creation and never changes — no computed() needed.
  protected readonly isInteractive: boolean =
    this.host.nativeElement.tagName === 'A' ||
    this.host.nativeElement.tagName === 'BUTTON';
}
