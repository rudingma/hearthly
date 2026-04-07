/**
 * Patch @ionic/core package.json to add "exports" for ESM compatibility.
 *
 * @ionic/core v8.x does not define an "exports" field in its package.json,
 * causing Node.js ESM to reject bare directory imports like
 * `import ... from '@ionic/core/components'` (used by @ionic/angular).
 *
 * This postinstall script adds the missing "exports" map so that Vitest
 * (via the @angular/build unit-test runner) can resolve these imports.
 *
 * See: https://github.com/ionic-team/ionic-framework/issues/
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = resolve(__dirname, '../node_modules/@ionic/core/package.json');

if (!existsSync(pkgPath)) {
  // @ionic/core not installed yet — skip silently during initial install.
  process.exit(0);
}

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

if (pkg.exports) {
  // Already patched or upstream fixed — nothing to do.
  process.exit(0);
}

pkg.exports = {
  '.': {
    import: './dist/index.js',
    require: './dist/index.cjs.js',
    types: './dist/types/interface.d.ts',
  },
  './components': {
    import: './components/index.js',
    require: './components/index.js',
    types: './components/index.d.ts',
  },
  './components/*': {
    import: './components/*',
    require: './components/*',
  },
  './css/*': './css/*',
  './dist/*': './dist/*',
  './hydrate': './hydrate/index.js',
  './loader': './loader/index.js',
};

writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('Patched @ionic/core package.json with ESM exports map.');
