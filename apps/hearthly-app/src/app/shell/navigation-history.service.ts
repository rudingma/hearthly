import { Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, skip, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NavigationHistoryService {
  private readonly hasNavigated = signal(false);
  readonly canGoBack = this.hasNavigated.asReadonly();

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        skip(1),
        take(1),
        takeUntilDestroyed()
      )
      .subscribe(() => this.hasNavigated.set(true));
  }
}
