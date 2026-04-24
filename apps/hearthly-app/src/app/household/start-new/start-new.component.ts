import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PageContainerComponent } from '../../ui/page-container/page-container.component';
import { ButtonDirective } from '../../ui/button.directive';
import { trimmedNonEmptyValidator } from '../../common/validators/trimmed-non-empty.validator';
import {
  CreateHouseholdGQL,
  MyHouseholdsDocument,
  type MyHouseholdsQuery,
} from '../../../generated/graphql';

export type SubmitPhase =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'error'; message: string }
  | { phase: 'succeeded' };

@Component({
  selector: 'app-household-start-new',
  standalone: true,
  imports: [ReactiveFormsModule, PageContainerComponent, ButtonDirective],
  templateUrl: './start-new.component.html',
  styleUrl: './start-new.component.scss',
})
export class StartNewComponent {
  private readonly createHouseholdGQL = inject(CreateHouseholdGQL);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.maxLength(80),
        trimmedNonEmptyValidator,
      ],
    }),
  });

  // Discriminated phase signal — the sole source of truth for the
  // mutation lifecycle. Impossible combinations (e.g. succeeded+error)
  // are unrepresentable.
  readonly submitPhase = signal<SubmitPhase>({ phase: 'idle' });

  // Display-layer selectors derived from `submitPhase`. Templates read these;
  // the component logic reads `submitPhase()` for full discriminated matching.
  protected readonly submitError = computed<string | null>(() => {
    const s = this.submitPhase();
    return s.phase === 'error' ? s.message : null;
  });

  protected readonly isSubmitting = computed(
    () => this.submitPhase().phase === 'submitting'
  );

  protected readonly hasSucceeded = computed(
    () => this.submitPhase().phase === 'succeeded'
  );

  onSubmit(): void {
    const phase = this.submitPhase().phase;
    // Early-return on in-flight OR terminal-success. The latter guards
    // a real race: a fast double-click or a cancelled navigation after
    // success could otherwise fire a second createHousehold mutation
    // with a fresh clientMutationId — platform idempotency is deferred
    // to #119 so the server would create a duplicate household row.
    if (this.form.invalid || phase === 'submitting' || phase === 'succeeded') {
      return;
    }

    this.submitPhase.set({ phase: 'submitting' });

    const input = {
      name: this.form.controls.name.value,
      clientMutationId: crypto.randomUUID(),
    };

    this.createHouseholdGQL
      .mutate({
        variables: { input },
        update: (cache, { data }) => {
          const created = data?.createHousehold.household;
          if (!created) return;
          const existing =
            cache.readQuery<MyHouseholdsQuery>({
              query: MyHouseholdsDocument,
            })?.myHouseholds ?? [];
          cache.writeQuery<MyHouseholdsQuery>({
            query: MyHouseholdsDocument,
            data: { myHouseholds: [...existing, created] },
          });
        },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // First success is terminal for this component: phase stays
          // 'succeeded' so the button remains disabled even if the
          // navigation promise rejects or resolves to false.
          this.submitPhase.set({ phase: 'succeeded' });
          // I1: navigateByUrl returns Promise<boolean>; if it rejects,
          // we'd leak an unhandled promise rejection (subscribe.next is
          // fire-and-forget). Defensive symmetry with the round-2
          // oauthService.logOut() fix: log, don't rollback state — the
          // mutation succeeded; the user just needs to refresh.
          this.router.navigateByUrl('/app/home').catch((err) => {
            console.error('StartNew: post-create navigation failed', err);
          });
        },
        error: () => {
          this.submitPhase.set({
            phase: 'error',
            message: "Couldn't create household. Please try again.",
          });
        },
      });
  }

  // I2 — inline form-validation a11y helper. Shows the error only after
  // the field has been touched (blurred), matching Angular Material's
  // default UX pattern. Re-runs each CD cycle because touched/invalid
  // are tracked via Angular forms, not signals — that's idiomatic for
  // reactive forms today.
  protected showNameError(): boolean {
    const c = this.form.controls.name;
    return c.touched && c.invalid;
  }
}
