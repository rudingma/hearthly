import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it, afterEach } from 'vitest';
import { App } from './app';

describe('App', () => {
  afterEach(() => {
    document.querySelectorAll('main[tabindex="-1"]').forEach((m) => m.remove());
  });

  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('focuses <main tabindex="-1"> after a NavigationEnd', async () => {
    const events$ = new Subject<NavigationEnd>();
    const routerStub = { events: events$.asObservable() } as unknown as Router;

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: Router, useValue: routerStub }],
    }).compileComponents();

    // Synthetic <main> anchored via a unique data-testid so the assertion
    // doesn't depend on document-order coincidence if a future test renders
    // its own <main> inside the App fixture.
    const main = document.createElement('main');
    main.setAttribute('tabindex', '-1');
    main.setAttribute('data-testid', 'app-spec-main');
    document.body.appendChild(main);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    events$.next(new NavigationEnd(1, '/app/home', '/app/home'));
    // TestBed.tick() flushes afterNextRender callbacks (Angular 20+).
    TestBed.tick();
    await fixture.whenStable();

    expect(document.activeElement).toBe(
      document.querySelector('main[data-testid="app-spec-main"]')
    );
  });
});
