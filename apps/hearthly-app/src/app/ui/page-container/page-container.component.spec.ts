import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { PageContainerComponent } from './page-container.component';

describe('PageContainerComponent', () => {
  it('renders with the standard host class by default', () => {
    const fixture = TestBed.createComponent(PageContainerComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('app-page-container')).toBe(true);
    expect(host.classList.contains('app-page-container--constrained')).toBe(
      false
    );
  });

  it('adds the --constrained class when mode is constrained', () => {
    const fixture = TestBed.createComponent(PageContainerComponent);
    fixture.componentRef.setInput('mode', 'constrained');
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains('app-page-container--constrained')).toBe(
      true
    );
  });
});
