import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Hearthly brand mark SVG. Single source of truth for the house logo
 * so future brand updates touch one file.
 *
 * Two variants:
 *  - `full` (default): detailed 5-element house with tinted interior shapes.
 *    Used by the welcome page hero at ~80px.
 *  - `compact`: simplified 2-element outline + single accent. Used by
 *    `<app-header>`'s leading slot at ~28px.
 *
 * Size is controlled by the parent via width/height on the host element
 * (e.g. `<app-brand-mark class="w-20 h-20" />`). The SVG scales to fill.
 * Decorative (`aria-hidden="true"`) — consuming components provide the
 * accessible name through the surrounding element.
 */
@Component({
  selector: 'app-brand-mark',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
  },
  template: `
    @switch (variant()) { @case ('full') {
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 48L50 14L86 48V88H14V48Z"
        stroke="var(--color-hearth-terracotta)"
        stroke-width="5.5"
        stroke-linejoin="round"
        fill="none"
      />
      <path
        d="M8 50L50 10L92 50"
        stroke="var(--color-hearth-terracotta)"
        stroke-width="5.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"
      />
      <rect
        x="37"
        y="54"
        width="26"
        height="34"
        rx="13"
        fill="var(--color-terracotta-tint)"
        opacity="0.6"
      />
      <rect
        x="42"
        y="58"
        width="16"
        height="30"
        rx="8"
        fill="var(--color-hearth-terracotta)"
        opacity="0.3"
      />
    </svg>
    } @case ('compact') {
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 48L50 14L86 48V88H14V48Z"
        stroke="var(--color-hearth-terracotta)"
        stroke-width="7"
        stroke-linejoin="round"
        fill="none"
      />
      <rect
        x="40"
        y="56"
        width="20"
        height="32"
        rx="10"
        fill="var(--color-hearth-terracotta)"
        opacity="0.3"
      />
    </svg>
    } }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      svg {
        width: 100%;
        height: 100%;
        display: block;
      }
    `,
  ],
})
export class BrandMarkComponent {
  readonly variant = input<'full' | 'compact'>('compact');
}
