import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { HearthlyTitleStrategy } from './title-strategy';

describe('HearthlyTitleStrategy', () => {
  it('is registered as the Router TitleStrategy via useExisting', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TitleStrategy, useExisting: HearthlyTitleStrategy },
      ],
    });
    expect(TestBed.inject(TitleStrategy)).toBe(
      TestBed.inject(HearthlyTitleStrategy)
    );
  });

  it('sets document.title to "<Page> | Hearthly" and mirrors via currentTitle()', () => {
    const strategy = TestBed.inject(HearthlyTitleStrategy);
    const titleService = TestBed.inject(Title);
    vi.spyOn(strategy, 'buildTitle').mockReturnValue('Home');

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(titleService.getTitle()).toBe('Home | Hearthly');
    expect(strategy.currentTitle()).toBe('Home');
  });

  it('falls back to "Hearthly" when the route declares no title', () => {
    const strategy = TestBed.inject(HearthlyTitleStrategy);
    const titleService = TestBed.inject(Title);
    vi.spyOn(strategy, 'buildTitle').mockReturnValue(undefined);

    strategy.updateTitle({} as RouterStateSnapshot);

    expect(titleService.getTitle()).toBe('Hearthly');
    expect(strategy.currentTitle()).toBe('Hearthly');
  });
});
