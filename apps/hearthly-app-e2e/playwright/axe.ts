import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Single source of truth for axe config. Specs MUST call analyzeA11y(page)
 * rather than instantiating AxeBuilder directly — enforced by the
 * no-restricted-imports ESLint rule in eslint.config.mjs.
 *
 * Filter: serious + critical impact only. moderate/minor deliberately not
 * surfaced — they're noisy (landmark-unique, empty-heading, etc.) and the
 * gate is about shipping violations that affect real users.
 *
 * color-contrast is non-waivable (DESIGN.md §9) — serious impact, always
 * surfaces.
 */
export async function analyzeA11y(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact ?? '')
  );
}
