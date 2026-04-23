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
    expect(navigateSpy).toHaveBeenCalledWith('/app/home');
  });

  it('shows inline error and resets isSubmitting on mutation failure', async () => {
    mutateFn.mockReturnValue(throwError(() => new Error('boom')));
    const f = TestBed.createComponent(StartNewComponent);
    f.detectChanges();
    f.componentInstance.form.controls.name.setValue('Fail Case');
    f.componentInstance.onSubmit();
    await Promise.resolve();
    expect(f.componentInstance.submitError()).not.toBeNull();
    expect(f.componentInstance.isSubmitting()).toBe(false);
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
});
