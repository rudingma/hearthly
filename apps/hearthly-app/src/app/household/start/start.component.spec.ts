import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StartComponent } from './start.component';

describe('StartComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the hero title, body, and both CTAs with correct routerLinks', () => {
    const fixture = TestBed.createComponent(StartComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')?.textContent).toContain(
      'Welcome to Hearthly'
    );
    expect(el.textContent).toContain(
      'Hearthly organizes shared household life'
    );

    const create = el.querySelector<HTMLAnchorElement>(
      '[data-testid="household-start-create-cta"]'
    );
    const join = el.querySelector<HTMLAnchorElement>(
      '[data-testid="household-start-join-cta"]'
    );
    expect(create?.getAttribute('href')).toBe('/app/start/new');
    expect(join?.getAttribute('href')).toBe('/app/join');
  });
});
