import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { StartNewComponent } from './start-new.component';
import { CreateHouseholdGQL } from '../../../generated/graphql';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('StartNewComponent', () => {
  let mutateFn: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    mutateFn = vi.fn().mockReturnValue(
      of({
        data: {
          createHousehold: {
            household: { id: 'h1', name: 'X', createdAt: '', updatedAt: '' },
          },
        },
      })
    );
    await TestBed.configureTestingModule({
      imports: [StartNewComponent],
      providers: [
        provideRouter([]),
        { provide: CreateHouseholdGQL, useValue: { mutate: mutateFn } },
      ],
    }).compileComponents();
    navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
  });

  it('rejects whitespace-only names (trim validator) and disables submit', () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    const comp = f.componentInstance;
    comp.form.controls.name.setValue('   ');
    expect(comp.form.valid).toBe(false);
    expect(comp.submitPhase().phase).toBe('idle');
  });

  it('sends a clientMutationId formatted as UUID v4 on submit', () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    f.componentInstance.form.controls.name.setValue('Smith Family');
    f.componentInstance.onSubmit();

    expect(mutateFn).toHaveBeenCalledOnce();
    const [options] = mutateFn.mock.calls[0];
    expect(options.variables.input.name).toBe('Smith Family');
    expect(options.variables.input.clientMutationId).toMatch(UUID_V4);
  });

  it('navigates to /app/home on successful mutation', async () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    f.componentInstance.form.controls.name.setValue('Foo');
    f.componentInstance.onSubmit();
    await Promise.resolve();
    expect(f.componentInstance.submitPhase().phase).toBe('succeeded');
    expect(navigateSpy).toHaveBeenCalledWith('/app/home');
  });

  it('shows inline error on mutation failure, phase transitions to error', async () => {
    mutateFn.mockReturnValue(throwError(() => new Error('boom')));
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    f.componentInstance.form.controls.name.setValue('Fail Case');
    f.componentInstance.onSubmit();
    await Promise.resolve();
    const s = f.componentInstance.submitPhase();
    expect(s.phase).toBe('error');
    if (s.phase === 'error') {
      expect(s.message).toBe("Couldn't create household. Please try again.");
    }
  });

  it('second onSubmit() after success does not fire a second mutation', async () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    f.componentInstance.form.controls.name.setValue('Foo');
    f.componentInstance.onSubmit();
    await Promise.resolve();
    expect(mutateFn).toHaveBeenCalledTimes(1);
    expect(f.componentInstance.submitPhase().phase).toBe('succeeded');

    // User fast-double-clicks or a cancelled navigation re-exposes the button.
    f.componentInstance.onSubmit();
    await Promise.resolve();
    // Still 1 — guarded by phase === 'succeeded' early-return.
    expect(mutateFn).toHaveBeenCalledTimes(1);
  });

  it('destroyed component does not navigate when a late mutation response arrives', async () => {
    const subject = new Subject<unknown>();
    mutateFn.mockReturnValue(subject.asObservable());

    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    f.componentInstance.form.controls.name.setValue('Foo');
    f.componentInstance.onSubmit();

    f.destroy();

    // Late response arrives after component is destroyed.
    subject.next({
      data: {
        createHousehold: {
          household: {
            __typename: 'Household',
            id: 'h1',
            name: 'Foo',
            createdAt: '',
            updatedAt: '',
          },
        },
      },
    });
    subject.complete();
    await Promise.resolve();

    // navigateByUrl was never invoked for the late response.
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does not show name error before the field is touched', () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    f.componentInstance.form.controls.name.setValue('   '); // invalid
    f.detectChanges();
    expect(el.querySelector('[data-testid="household-name-error"]')).toBeNull();
    expect(
      el.querySelector('#household-name')?.getAttribute('aria-invalid')
    ).toBeNull();
  });

  it('shows name error and aria-invalid once the field is touched and invalid', () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const input = el.querySelector<HTMLInputElement>('#household-name')!;
    f.componentInstance.form.controls.name.setValue('   ');
    f.componentInstance.form.controls.name.markAsTouched();
    f.detectChanges();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('household-name-error');
    expect(
      el.querySelector('[data-testid="household-name-error"]')
    ).not.toBeNull();
  });

  it('post-create navigation rejection is logged and does not throw', async () => {
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    const router = TestBed.inject(Router);
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.spyOn(router, 'navigateByUrl').mockRejectedValueOnce(
      new Error('nav failed')
    );
    f.componentInstance.form.controls.name.setValue('Foo');
    f.componentInstance.onSubmit();
    await Promise.resolve();
    await Promise.resolve(); // double microtask: subscribe.next → navigate.catch
    expect(f.componentInstance.submitPhase().phase).toBe('succeeded');
    expect(consoleSpy).toHaveBeenCalledWith(
      'StartNew: post-create navigation failed',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
