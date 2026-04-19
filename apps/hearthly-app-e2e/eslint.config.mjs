import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {},
  },
  {
    // DESIGN.md §9: color-contrast is non-waivable. Specs MUST route through
    // playwright/axe.ts — no direct AxeBuilder or axe-core use allowed.
    files: ['src/**/*.{spec,test}.{ts,js}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@axe-core/playwright',
              message:
                'Import analyzeA11y from the sanctioned helper (playwright/axe.ts). Direct AxeBuilder use is prohibited (DESIGN.md §9).',
            },
            {
              name: 'axe-core',
              message:
                'Do not inject axe-core directly. Use analyzeA11y from the sanctioned helper (playwright/axe.ts) — DESIGN.md §9.',
            },
          ],
          patterns: [
            {
              group: ['@axe-core/playwright/*', 'axe-core/*'],
              message:
                'Do not import axe via sub-paths. Use analyzeA11y from the sanctioned helper (playwright/axe.ts) — DESIGN.md §9.',
            },
          ],
        },
      ],
    },
  },
];
