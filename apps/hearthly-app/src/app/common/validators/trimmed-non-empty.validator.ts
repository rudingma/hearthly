import type {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const trimmedNonEmptyValidator: ValidatorFn = (
  ctrl: AbstractControl
): ValidationErrors | null =>
  typeof ctrl.value === 'string' && ctrl.value.trim().length > 0
    ? null
    : { trimmedNonEmpty: true };
