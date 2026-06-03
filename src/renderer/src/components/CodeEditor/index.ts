export { CodeEditor, type CodeEditorProps } from './CodeEditor';
// `CodeLanguage` / `CodeLanguageKey` are part of the public API (both CodeBlock
// and CodeEditor accept a `language` of this type), so they surface through the
// top-level components barrel. The shared CM6 internals (useCodeMirror,
// codeMirrorBase, heliosHighlightStyle, resolveLanguage) are consumed by
// CodeBlock via direct relative imports and are intentionally NOT re-exported
// here — re-exporting them would create unused public exports.
export type { CodeLanguage, CodeLanguageKey } from './languageExtension';
