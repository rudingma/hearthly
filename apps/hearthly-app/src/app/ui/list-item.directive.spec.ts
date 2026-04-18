import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ListItemDirective } from './list-item.directive';

@Component({
  standalone: true,
  imports: [ListItemDirective],
  template: `
    <a appListItem href="#">interactive</a>
    <li appListItem>non-interactive</li>
  `,
})
class Host {}

describe('ListItemDirective', () => {
  it('applies base class on every host', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const nodes = fixture.nativeElement.querySelectorAll('.app-list-item');
    expect(nodes.length).toBe(2);
  });

  it('adds --interactive class only for <a> and <button> hosts', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const a = fixture.nativeElement.querySelector('a');
    const li = fixture.nativeElement.querySelector('li');
    expect(a.classList.contains('app-list-item--interactive')).toBe(true);
    expect(li.classList.contains('app-list-item--interactive')).toBe(false);
  });
});
