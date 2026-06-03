import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import type { Extension } from '@codemirror/state';

/**
 * The language keys both Code Block and Code Editor accept. Kept deliberately
 * small: Helios ships JSON linting only and "contact the team for more"; we ship
 * the native CM6 languages that cover our actual demo/highlighting needs. A
 * caller that needs another language can pass a raw CodeMirror `Extension`
 * directly instead of a key.
 *
 * `'plaintext'` (or omitting the prop) means no language extension — the editor
 * still renders, just without syntax highlighting.
 */
export type CodeLanguageKey = 'json' | 'javascript' | 'jsx' | 'typescript' | 'tsx' | 'plaintext';

/**
 * A language is either one of the known keys (resolved here) or a pre-built
 * CodeMirror language `Extension` the caller supplies. Accepting both keeps the
 * common case ergonomic without locking out languages we don't bundle.
 */
export type CodeLanguage = CodeLanguageKey | Extension;

/** Resolve a {@link CodeLanguage} to the CM6 extension(s) that enable it. */
export function resolveLanguage(language: CodeLanguage | undefined): Extension {
  if (language == null) return [];
  if (typeof language !== 'string') return language; // already an Extension

  switch (language) {
    case 'json':
      return json();
    case 'javascript':
      return javascript();
    case 'jsx':
      return javascript({ jsx: true });
    case 'typescript':
      return javascript({ typescript: true });
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'plaintext':
      return [];
    default:
      return [];
  }
}
