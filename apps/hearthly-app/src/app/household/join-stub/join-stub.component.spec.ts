import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JoinStubComponent } from './join-stub.component';

describe('JoinStubComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinStubComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders placeholder copy and a back link to /app/start', () => {
    const f = TestBed.createComponent(JoinStubComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.textContent).toContain('Invites are coming soon');
    const back = el.querySelector<HTMLAnchorElement>('a[routerLink]');
    expect(back?.getAttribute('href')).toBe('/app/start');
  });
});
