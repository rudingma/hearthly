import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { NavigationHistoryService } from './navigation-history.service';

describe('NavigationHistoryService', () => {
  it('reports canGoBack=false until the second NavigationEnd', () => {
    const events$ = new Subject<NavigationEnd>();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: events$.asObservable() } },
      ],
    });
    const svc = TestBed.inject(NavigationHistoryService);
    expect(svc.canGoBack()).toBe(false);
    events$.next(new NavigationEnd(1, '/', '/'));
    expect(svc.canGoBack()).toBe(false);
    events$.next(new NavigationEnd(2, '/app/home', '/app/home'));
    expect(svc.canGoBack()).toBe(true);
  });
});
