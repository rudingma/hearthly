import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
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
import { trimmedNonEmptyValidator } from '../validators/trimmed-non-empty.validator';
import {
  CreateHouseholdGQL,
  MyHouseholdsDocument,
  type MyHouseholdsQuery,
} from '../../../generated/graphql';

@Component({
  selector: 'app-household-start-new',
  standalone: true,
  imports: [ReactiveFormsModule, PageContainerComponent, ButtonDirective],
  templateUrl: './start-new.component.html',
  styleUrl: './start-new.component.scss',
})
export class StartNewComponent implements AfterViewInit {
  @ViewChild('nameInput')
  private readonly nameInput!: ElementRef<HTMLInputElement>;
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

  readonly isSubmitting = signal(false);
  readonly hasSucceeded = signal(false);
  readonly submitError = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.nameInput.nativeElement.focus();
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting() || this.hasSucceeded()) return;
    this.isSubmitting.set(true);
    this.submitError.set(null);

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
          // First success is terminal. Keep the submit button disabled for
          // the rest of this component's lifetime so a fast double-click
          // or a cancelled navigation can't trigger a second createHousehold
          // mutation — the server has no idempotency layer yet (deferred to
          // #119), so a duplicate mutation creates a second household row.
          this.hasSucceeded.set(true);
          this.router.navigateByUrl('/app/home');
        },
        error: () => {
          this.submitError.set("Couldn't create household. Please try again.");
          this.isSubmitting.set(false);
        },
      });
  }
}
