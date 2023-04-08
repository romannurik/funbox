import colornames from 'colornames';
import { diffChars } from 'diff';
import 'monaco-editor/esm/vs/editor/editor.all';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import React, { useEffect, useRef, useState } from "react";
import tinycolor from 'tinycolor2';
import matColor from '../../material-colors';
import { NAMED_COLORS, findNearestNamedColor } from './colors';
import snippets from './snippets';

export function CodeEditor({ code, error, onCodeChange, ...props }) {
  let [node, setNode] = useState(null);
  let editor = useRef(null);
  let pauseOnCodeChange = useRef(false);
  let onCodeChangeRef = useRef(onCodeChange);

  useEffect(() => {
    let disposeGlobal = setupMonaco();
    return () => disposeGlobal();
  }, []);

  useEffect(() => {
    if (!editor.current) {
      return;
    }
    let model = editor.current.getModel();
    let curValue = model.getValue();
    if (curValue !== code) {
      // model.setValue(code);
      pauseOnCodeChange.current = true;
      diffAndApply(model, code);
      pauseOnCodeChange.current = false;
    }
  }, [code]);

  useEffect(() => {
    onCodeChangeRef.current = onCodeChange;
  }, [onCodeChange]);

  useEffect(() => {
    const model = editor.current?.getModel();
    if (!model) {
      return;
    }

    if (!error) {
      monaco.editor.setModelMarkers(model, 'main', []);
      return;
    }

    const position = model.getPositionAt(error.position);
    const endPosition = error.endPosition
      ? model.getPositionAt(error.endPosition)
      : model.getPositionAt(error.position + 1);
    monaco.editor.setModelMarkers(model, 'main', [
      {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column,
        message: error.message,
        severity: monaco.MarkerSeverity.Error,
      }
    ]);
  }, [error]);

  useEffect(() => {
    if (!node) return;

    editor.current = monaco.editor.create(node, {
      value: code,
      language: 'kid',
      folding: false,
      lineNumbersMinChars: 3,
      minimap: {
        enabled: false,
      },
      padding: {
        top: 16,
        bottom: 16,
      },
      wordBasedSuggestions: false,
      fontFamily: 'var(--font-family-code)',
      fontSize: 16,
      lineHeight: 22,
      fontLigatures: false,
      automaticLayout: true,
      theme: 'kid-theme',
    });
    editor.current.updateOptions({
      tabSize: 2,
      detectIndentation: false,
      insertSpaces: true,
    });
    const onEditSubscription = editor.current.onDidChangeModelContent(() => {
      if (pauseOnCodeChange.current) {
        return;
      }
      onCodeChangeRef.current && onCodeChangeRef.current(editor.current.getValue());
    });
    return () => {
      editor.current.dispose();
      editor.current = null;
      onEditSubscription.dispose();
    }
  }, [node]);

  return <div {...props} ref={node => setNode(node)} />;
}

function setupMonaco() {
  let disposables = [];
  monaco.editor.defineTheme('kid-theme', {
    base: "vs-dark",
    inherit: true,
    rules: [
      { background: "162b4b", token: "" },
      { foreground: matColor('indigo', '300'), token: "comment" },
      { foreground: matColor('pink', 'a100'), token: "keyword" },
      { foreground: matColor('cyan', 'a400'), token: "ident" },
      { foreground: matColor('indigo', '300'), token: "operator" },
      { foreground: matColor('deep-orange', 'a100'), token: "string" },
      { foreground: matColor('green', 'a200'), token: "func-name" },
      { foreground: matColor('yellow', '600'), token: "number" },
    ],
    colors: {
      "editor.foreground": "#ffffffff",
      "editor.background": "#00000000",
      "editor.selectionBackground": matColor('indigo', '500'),
      "editor.inactiveSelectionBackground": '#ffffff20',
      "editor.lineHighlightBackground": "#ffffff10",
      "editorLineNumber.foreground": "#ffffff20",
      "editor.foldBackground": "#ffffffff",
      "editorCursor.foreground": "#ffffffff",
      "editorIndentGuide.background": "#ffffff10",
      "editorWhitespace.foreground": "#ffffff00"
    }
  });
  monaco.languages.register({ id: 'kid' });
  disposables.push(
    monaco.languages.setLanguageConfiguration('kid', {
      comments: {
        lineComment: '#',
      }
    }),
    monaco.languages.setMonarchTokensProvider('kid', {
      tokenizer: {
        root: [
          [/\d+|ROWS?|COLUMNS?/, "number"],
          [/((?:FUNCTION|CALL)\s*)([a-z]\w*)/, ["keyword", "func-name"]],
          [/[A-Z]+/, "keyword"],
          [/[a-z]\w*/, "ident"],
          [/"[^"]*"/, "string"],
          [/#.*$/, "comment"],
          [/\+|\-|\=|\*|\//, "operator"],
        ],
      },
    }),
    monaco.languages.registerColorProvider("kid", {
      provideColorPresentations: (model, colorInfo) => {
        let nearestNamedColor = findNearestNamedColor({
          r: colorInfo.color.red * 255,
          g: colorInfo.color.green * 255,
          b: colorInfo.color.blue * 255
        });
        return [
          {
            label: "Change color",
            textEdit: {
              range: colorInfo.range,
              text: nearestNamedColor,
            },
          }
        ];
      },
      provideDocumentColors: (model) => {
        let dc = [];
        for (let c of NAMED_COLORS) {
          let matches = model.findMatches('\\b' + c + '\\b', false, true);
          let hex = colornames.get(c).value;
          let { r, g, b } = tinycolor(hex).toRgb();
          for (let m of matches) {
            dc.push({
              color: { red: r / 255, green: g / 255, blue: b / 255 },
              range: m.range,
            });
          }
        }
        return dc;
      }
    }),
    monaco.languages.registerCompletionItemProvider('kid', {
      provideCompletionItems: function (model, position) {
        return {
          suggestions: Object.entries(snippets).map(([label, insertText]) => ({
            kind: monaco.languages.CompletionItemKind.Constant,
            label,
            insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          })),
        };
      }
    }),
  );

  return () => {
    for (let disposable of disposables) {
      disposable?.dispose();
    }
  };
}

function diffAndApply(model, newCode) {
  let curCode = model.getValue();
  let ops = [];
  let range = {
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: 1,
    endColumn: 1
  };
  let parts = diffChars(curCode, newCode);
  for (let i = 0; i < parts.length; i++) {
    let { count, value, added, removed } = parts[i];
    if (added) {
      ops.push({
        range: { ...range },
        forceMoveMarkers: true,
        text: value
      });
      continue;
    }

    // found a removed or unchanged chunk of text, move the range
    range.startLineNumber = range.endLineNumber;
    range.startColumn = range.endColumn;
    let [ln, col] = advanceLineNumberAndCol(value, range.startLineNumber, range.startColumn);
    range.endLineNumber = ln;
    range.endColumn = col;

    if (removed) {
      if (parts[i + 1]?.added) {
        // remove + add
        ops.push({
          range: { ...range },
          forceMoveMarkers: true,
          text: parts[i + 1].value
        });
        ++i;
      } else {
        // just a remove
        ops.push({
          range: { ...range },
          text: null
        });
      }
    }

    range.startLineNumber = range.endLineNumber;
    range.startColumn = range.endColumn;
  }

  try {
    model.applyEdits(ops);
  } catch (e) {
    console.error(e);
    // fallback to just forcing the value
    model.setValue(newCode);
  }
}

function advanceLineNumberAndCol(str, startLineNumber, startColumn) {
  let lineNumber = startLineNumber;
  let idx = 0;
  let lastNewline = -1;
  while ((idx = str.indexOf('\n', idx)) >= 0) {
    // found a newline
    ++lineNumber;
    ++idx; // move past the newline
    lastNewline = idx;
  }
  let column = (lastNewline >= 0)
    ? str.length - lastNewline + 1
    : startColumn + str.length;
  return [lineNumber, column];
}