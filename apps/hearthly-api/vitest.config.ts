import { defineConfig } from 'vitest/config';
import { join } from 'path';

export default defineConfig({
  test: {
    root: join(__dirname),
    include: ['src/**/*.spec.ts'],
  },
});
