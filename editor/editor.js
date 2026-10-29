// CodeMirror 6 setup for pwnctual. Bundled into web/vendor/editor.js by
// `npm run build:editor`, so the site loads one small file and no CDN.
import { EditorState } from "@codemirror/state";
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  drawSelection, highlightSpecialChars,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  indentOnInput, bracketMatching, syntaxHighlighting, indentUnit,
} from "@codemirror/language";
import { classHighlighter } from "@lezer/highlight";
import { cpp } from "@codemirror/lang-cpp";
import { python } from "@codemirror/lang-python";

const LANGUAGES = { c: cpp, python };

// Colours come from CSS variables in app.css, so light and dark mode just work.
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "14px", backgroundColor: "transparent", color: "var(--on-surface)" },
  ".cm-scroller": { fontFamily: "var(--font-code)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--primary)", padding: "12px 0" },
  ".cm-gutters": { backgroundColor: "transparent", color: "var(--on-surface-variant)", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px", opacity: "0.6" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--editor-active-line)" },
  ".cm-cursor": { borderLeftColor: "var(--primary)", borderLeftWidth: "2px" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--editor-selection) !important",
  },
  ".cm-matchingBracket": { backgroundColor: "var(--editor-selection)", outline: "none" },
});

export function createEditor(parent, { value = "", language = "c", onChange = () => {} } = {}) {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        indentOnInput(),
        bracketMatching(),
        highlightActiveLine(),
        indentUnit.of("    "),
        EditorState.tabSize.of(4),
        // Tab indents; Escape then Tab moves focus out, so keyboard users aren't trapped
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        syntaxHighlighting(classHighlighter),
        (LANGUAGES[language] ?? cpp)(),
        theme,
        EditorView.contentAttributes.of({ "aria-label": "Code editor", autocapitalize: "off", autocorrect: "off" }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChange(update.state.doc.toString());
        }),
      ],
    }),
  });
  return {
    get value() { return view.state.doc.toString(); },
    set value(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
    focus() { view.focus(); },
    destroy() { view.destroy(); },
  };
}
