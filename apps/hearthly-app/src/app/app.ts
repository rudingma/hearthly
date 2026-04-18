import { Component, inject, Injector, afterNextRender } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  imports: [IonApp, IonRouterOutlet],
  selector: 'app-root',
  template: `
    <ion-app>
      <ion-router-outlet></ion-router-outlet>
    </ion-app>
  `,
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
