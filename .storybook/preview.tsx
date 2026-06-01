import type { Preview } from '@storybook/react-vite';

import '../src/renderer/src/styles/app.css';

const preview: Preview = {
  parameters: {
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
