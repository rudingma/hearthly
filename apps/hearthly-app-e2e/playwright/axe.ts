import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Single source of truth for axe config. Specs MUST call analyzeA11y(page)
 * rather than instantiating AxeBuilder directly — enforced by the
 * no-restricted-imports ESLint rule in eslint.config.mjs.
 *
 * `color-contrast` is non-waivable (DESIGN.md §9). `landmark-unique` is
 * re-enabled explicitly to be resilient to future axe-core defaults.
 */
export async function analyzeA11y(page: Page) {
  const results = await new AxeBuilder({ page })
    .options({ rules: { 'landmark-unique': { enabled: true } } })
    .analyze();
  return results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );
}
