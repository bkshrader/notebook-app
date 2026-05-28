import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import storybook from 'eslint-plugin-storybook';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/',
      '**/out/',
      '**/dist/',
      '**/storybook-static/',
      // Nested worktrees under `.claude/worktrees/` are independent
      // checkouts of this repo and must not be linted as part of the
      // main repo — they have their own commits, hooks, and lint
      // surface. Without this exclusion, every concurrent Claude
      // session in another worktree pollutes the main repo's lint
      // output. CI doesn't see this because CI checks out a fresh
      // repo with no nested worktrees; local pre-push does.
      '.claude/worktrees/',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  // Node-side scripts (CI helpers, etc.) need Node globals declared so
  // `no-undef` doesn't flag `URL`, `fetch`, `process`, `AbortSignal`, etc.
  // Scoped narrowly to `scripts/**` so renderer code (which runs in the
  // Electron sandbox) doesn't pick up Node globals it shouldn't have.
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    ...jsxA11y.flatConfigs.strict,
  },
  ...storybook.configs['flat/recommended'],
  prettier,
);
