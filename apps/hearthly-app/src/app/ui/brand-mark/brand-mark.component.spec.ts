import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { BrandMarkComponent } from './brand-mark.component';

describe('BrandMarkComponent', () => {
  it('renders the compact variant by default (2 SVG elements)', () => {
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg).not.toBeNull();
    // Compact variant: one <path> outline + one <rect> accent = 2 shapes.
    expect(svg.children.length).toBe(2);
    expect(fixture.nativeElement.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the full variant with 4 detailed SVG elements', () => {
    const fixture = TestBed.createComponent(BrandMarkComponent);
    fixture.componentRef.setInput('variant', 'full');
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement;
    expect(svg).not.toBeNull();
    // Full variant: 2 <path>s + 2 tinted <rect>s = 4 shapes.
    expect(svg.children.length).toBe(4);
  });
});
