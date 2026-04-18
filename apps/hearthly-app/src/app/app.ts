import { Component, inject, Injector, afterNextRender } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    const injector = inject(Injector);
    const router = inject(Router);

    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        afterNextRender(
          () =>
            document
              .querySelector<HTMLElement>('main[tabindex="-1"]')
              ?.focus({ preventScroll: true }),
          { injector }
        );
      });
  }
}
