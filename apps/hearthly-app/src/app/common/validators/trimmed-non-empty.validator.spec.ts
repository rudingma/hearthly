import { describe, it, expect } from 'vitest';
import { FormControl } from '@angular/forms';
import { trimmedNonEmptyValidator } from './trimmed-non-empty.validator';

describe('trimmedNonEmptyValidator', () => {
  it('returns null for non-empty trimmed value', () => {
    const ctrl = new FormControl('Smith Family');
    expect(trimmedNonEmptyValidator(ctrl)).toBeNull();
  });

  it('returns error for whitespace-only value', () => {
    const ctrl = new FormControl('   ');
    expect(trimmedNonEmptyValidator(ctrl)).toEqual({ trimmedNonEmpty: true });
  });

  it('returns error for empty string', () => {
    const ctrl = new FormControl('');
    expect(trimmedNonEmptyValidator(ctrl)).toEqual({ trimmedNonEmpty: true });
  });

  it('returns error for null', () => {
    const ctrl = new FormControl(null);
    expect(trimmedNonEmptyValidator(ctrl)).toEqual({ trimmedNonEmpty: true });
  });

  it('returns error for non-string', () => {
    const ctrl = new FormControl(42);
    expect(trimmedNonEmptyValidator(ctrl)).toEqual({ trimmedNonEmpty: true });
  });
});
