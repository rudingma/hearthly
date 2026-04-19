import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-avatar',
    '[class.app-avatar--sm]': 'size() === "sm"',
    '[class.app-avatar--lg]': 'size() === "lg"',
  },
  styleUrl: './avatar.component.css',
  template: `
    @if (pictureUrl() && !imageError()) {
    <img
      [src]="pictureUrl()!"
      [width]="dimension()"
      [height]="dimension()"
      (error)="imageError.set(true)"
      alt=""
    />
    } @else {
    <span aria-hidden="true">{{ initials() }}</span>
    }
  `,
})
export class AvatarComponent {
  readonly pictureUrl = input<string | null>(null);
  readonly initials = input.required<string>();
  readonly size = input<'sm' | 'lg'>('sm');

  protected readonly imageError = signal(false);
  protected readonly dimension = computed(() =>
    this.size() === 'sm' ? 32 : 64
  );

  constructor() {
    effect(() => {
      this.pictureUrl();
      this.imageError.set(false);
    });
  }
}
