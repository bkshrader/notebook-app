import type { Preview } from '@storybook/react-vite';

import '../src/renderer/src/styles/app.css';
import { withThemeByDataAttribute } from '@storybook/addon-themes';

const preview: Preview = {
  // Reset focus to a known state before every story's play function. The
  // storybook test runner reuses ONE Chromium document across all stories in a
  // file (and the project runs them in a shared browser context), so a prior
  // story can leave focus on some element; an interaction test that does
  // `userEvent.tab()` from that ambient focus then lands on the wrong element
  // and fails intermittently. Blurring to <body> first makes each test's first
  // Tab deterministic regardless of run order — load-bearing for the
  // AdvancedTable grid-navigation and cross-story keyboard/focus-ring tests.
  beforeEach: () => {
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
  },
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // WCAG 2.1 AA is non-negotiable per CLAUDE.md — fail tests on violations,
      // not just surface them in the UI.
      test: 'error',
      config: {
        rules: [
          // Catch AAA-level findings too (aspirational, not enforced); the
          // 'error' mode above only fails on rules tagged as WCAG 2.1 AA.
          { id: 'color-contrast-enhanced', reviewOnFail: true },
        ],
      },
    },
  },
  globalTypes: {
    colorContrast: {
      name: 'Contrast',
      description: 'High-contrast mode (data-color-contrast)',
      defaultValue: 'default',
      toolbar: {
        icon: 'contrast',
        items: [
          { value: 'default', title: 'Contrast: default' },
          { value: 'more', title: 'Contrast: high' },
        ],
      },
    },
    reducedMotion: {
      name: 'Reduced motion',
      description: 'Honor prefers-reduced-motion',
      defaultValue: 'no-preference',
      toolbar: {
        icon: 'accessibility',
        items: [
          { value: 'no-preference', title: 'Motion: allowed' },
          { value: 'reduce', title: 'Motion: reduced' },
        ],
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: {
        light: 'light',
        dark: 'dark',
        system: 'system',
      },
      defaultTheme: 'system',
      attributeName: 'data-color-mode',
    }),
    (Story, context) => {
      if (typeof document !== 'undefined') {
        const colorContrast = context.globals.colorContrast as string | undefined;
        if (colorContrast === 'more') {
          document.documentElement.dataset.colorContrast = 'more';
        } else {
          delete document.documentElement.dataset.colorContrast;
        }
      }
      return <Story />;
    },
    (Story, context) => {
      if (typeof document !== 'undefined') {
        const reducedMotion = context.globals.reducedMotion as string | undefined;
        if (reducedMotion) {
          document.documentElement.dataset.reducedMotion = reducedMotion;
        }
      }
      return <Story />;
    },
  ],
};

export default preview;
