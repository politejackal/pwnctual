// CodeMirror 6 code viewer for pwnctual: read-only, with line numbers and
// syntax highlighting. Bundled into web/vendor/editor.js by `npm run build:editor`,
// so the site loads one small file and no CDN.
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, highlightSpecialChars } from "@codemirror/view";
import { syntaxHighlighting, indentUnit } from "@codemirror/language";
import { classHighlighter } from "@lezer/highlight";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";

const LANGUAGES = { c: cpp, python };

// Colours come from CSS variables in app.css, so light and dark mode just work.
const theme = EditorView.theme({
  "&": { fontSize: "14px", backgroundColor: "transparent", color: "var(--on-surface)" },
  ".cm-scroller": { fontFamily: "var(--font-code)", lineHeight: "1.6" },
  ".cm-content": { padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--on-surface-variant)", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px", opacity: "0.6" },
  "&.cm-focused": { outline: "none" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "var(--code-selection) !important" },
});

export function createCodeView(parent, { value = "", language = "c" } = {}) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightSpecialChars(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        // Read-only: text can still be selected and copied, but no cursor or
        // on-screen keyboard appears
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        syntaxHighlighting(classHighlighter),
        (LANGUAGES[language] ?? cpp)(),
        theme,
        EditorView.contentAttributes.of({ "aria-label": "Vulnerable code" }),
      ],
    }),
  });
  return { destroy: () => view.destroy() };
}
