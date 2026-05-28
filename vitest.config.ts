import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { playwright } from '@vitest/browser-playwright';

const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// When running from a git worktree under `.claude/worktrees/<name>/`, node_modules
// lives in the parent repo (npm resolves up the directory tree). Vite's default
// `server.fs.allow` is rooted at the worktree (it stops walking up at our local
// package.json + lockfile) and rejects the storybook addon's setup file path.
// Resolve a known dependency to find the actual node_modules root and add it.
// In CI / clean checkouts this resolves to the local node_modules, which is
// already allowed — harmless.
const require = createRequire(import.meta.url);
const nodeModulesRoot = path.dirname(
  path.dirname(path.dirname(require.resolve('@storybook/addon-vitest/package.json'))),
);

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        optimizeDeps: {
          include: ['react/jsx-dev-runtime'],
        },
        server: {
          fs: {
            allow: [dirname, nodeModulesRoot],
          },
        },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
