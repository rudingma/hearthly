import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ButtonDirective, type ButtonVariant } from './button.directive';

@Component({
  standalone: true,
  imports: [ButtonDirective],
  template: `<button appButton [variant]="variant()" [fullWidth]="full()">
    Go
  </button>`,
})
class Host {
  readonly variant = signal<ButtonVariant>('primary');
  readonly full = signal(false);
}

describe('ButtonDirective', () => {
  it('applies the base class and the variant class on host', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLElement;
    expect(btn.classList.contains('app-button')).toBe(true);
    expect(btn.classList.contains('app-button--primary')).toBe(true);
  });

  it('toggles variant and full-width classes via signal inputs', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    fixture.componentInstance.variant.set('ghost');
    fixture.componentInstance.full.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('button') as HTMLElement;
    expect(btn.classList.contains('app-button--ghost')).toBe(true);
    expect(btn.classList.contains('app-button--full-width')).toBe(true);
    expect(btn.classList.contains('app-button--primary')).toBe(false);
  });

  it('accepts the directive on <a> as well', () => {
    TestBed.overrideComponent(Host, {
      set: { template: `<a appButton variant="secondary">L</a>` },
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('a') as HTMLElement;
    expect(a.classList.contains('app-button')).toBe(true);
    expect(a.classList.contains('app-button--secondary')).toBe(true);
  });
});
