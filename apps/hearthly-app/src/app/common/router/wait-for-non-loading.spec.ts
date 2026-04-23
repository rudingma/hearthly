import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { waitForNonLoading } from './wait-for-non-loading';

describe('waitForNonLoading', () => {
  it('waits while isLoading is true; emits once the predicate flips', async () => {
    type S = { kind: 'loading' } | { kind: 'done'; value: number };
    const state = signal<S>({ kind: 'loading' });

    let settled = false;
    let resolved: number | undefined;

    TestBed.runInInjectionContext(() => {
      waitForNonLoading(
        state,
        (s) => s.kind === 'loading',
        (s) => (s.kind === 'done' ? s.value : -1)
      ).subscribe((v) => {
        settled = true;
        resolved = v;
      });
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(false);

    state.set({ kind: 'done', value: 42 });
    await new Promise((r) => setTimeout(r, 0));
    expect(settled).toBe(true);
    expect(resolved).toBe(42);
  });

  it('takes only the first non-loading value and completes', async () => {
    type S = { kind: 'loading' } | { kind: 'a' } | { kind: 'b' };
    const state = signal<S>({ kind: 'loading' });

    const values: S['kind'][] = [];
    TestBed.runInInjectionContext(() => {
      waitForNonLoading(
        state,
        (s) => s.kind === 'loading',
        (s) => s.kind
      ).subscribe((v) => {
        values.push(v);
      });
    });

    // Set 'a' and flush one microtask so the signal emission is processed
    // before setting 'b'. Angular's toObservable coalesces synchronous
    // signal writes within a single tick, so we must yield between them.
    state.set({ kind: 'a' });
    await new Promise((r) => setTimeout(r, 0));
    // 'a' has been emitted and take(1) completed the stream — 'b' is ignored.
    state.set({ kind: 'b' });
    await new Promise((r) => setTimeout(r, 0));
    expect(values).toEqual(['a']);
  });
});
