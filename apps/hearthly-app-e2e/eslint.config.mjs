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
    // DESIGN.md §9: color-contrast is non-waivable. Specs must route through
    // playwright/axe.ts — no direct AxeBuilder use allowed.
    files: ['src/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@axe-core/playwright',
              message:
                'Import `analyzeA11y` from `../playwright/axe` instead. Direct AxeBuilder use is prohibited (DESIGN.md §9).',
            },
          ],
        },
      ],
    },
  },
];
