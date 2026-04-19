import { inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

/**
 * Custom `TitleStrategy` for Hearthly.
 *
 * Uses Angular's standard `title` route key (not `data.title`) and drives both:
 *  - `document.title` — formatted as `"<Route Title> | Hearthly"` so the
 *    browser tab reflects the current page.
 *  - `currentTitle` signal — read by `ResponsiveShellComponent` to bind
 *    `<app-header [heading]>`.
 *
 * When a route doesn't declare a `title`, the signal falls back to `"Hearthly"`
 * and `document.title` becomes the plain brand name.
 *
 * Registered via `{ provide: TitleStrategy, useExisting: HearthlyTitleStrategy }`
 * in `app.config.ts` so the router uses this implementation and consumers can
 * inject it by its concrete class to read the signal.
 */
@Injectable({ providedIn: 'root' })
export class HearthlyTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly _currentTitle = signal<string>('Hearthly');

  readonly currentTitle = this._currentTitle.asReadonly();

  override updateTitle(state: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(state);
    this._currentTitle.set(pageTitle ?? 'Hearthly');
    this.title.setTitle(pageTitle ? `${pageTitle} | Hearthly` : 'Hearthly');
  }
}
