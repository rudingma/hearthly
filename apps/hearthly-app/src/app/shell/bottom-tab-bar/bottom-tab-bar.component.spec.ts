import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { LucideAngularModule } from 'lucide-angular';
import { BottomTabBarComponent } from './bottom-tab-bar.component';

describe('BottomTabBarComponent', () => {
  it('renders the Home tab with aria-label Primary', async () => {
    TestBed.configureTestingModule({
      imports: [BottomTabBarComponent, LucideAngularModule],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(BottomTabBarComponent);
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav');
    expect(nav!.getAttribute('aria-label')).toBe('Primary');
    expect(fixture.nativeElement.querySelectorAll('a').length).toBe(1);
  });
});
