import cn from 'classnames';
import colornames from 'colornames';
import { diffChars } from 'diff';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import React, { useEffect, useRef, useState } from "react";
import tinycolor from 'tinycolor2';
import matColor from '../../material-colors';
import styles from './CodeEditor.module.scss';
import { NAMED_COLORS, findNearestNamedColor } from './colors';
import snippets from './snippets';

// come after main import
import 'monaco-editor/esm/vs/editor/editor.all';

let refCount = 0;
let globalDispose;

const VERT_PADDING = 16;

export function CodeEditor({ fitHeight, style, className, code, error, onCodeChange, ...props }) {
  let [node, setNode] = useState(null);
  let editor = useRef(null);
  let pauseOnCodeChange = useRef(false);
  let [contentHeight, setContentHeight] = useState(0);
  let onCodeChangeRef = useRef(onCodeChange);

  useEffect(() => {
    // shared globals across instances
    if (refCount === 0) {
      globalDispose = setupMonaco();
    }
    ++refCount;

    return () => {
      --refCount;
      if (refCount === 0) {
        globalDispose();
      }
    }
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
      scrollbar: {
        useShadows: false,
        verticalHasArrows: true,
        arrowSize: 24,
      },
      lineNumbersMinChars: 3,
      minimap: {
        enabled: false,
      },
      padding: {
        top: VERT_PADDING,
        bottom: VERT_PADDING,
      },
      wordBasedSuggestions: false,
      fontFamily: 'var(--font-family-code)',
      fontSize: 16,
      lineHeight: 22,
      fontLigatures: false,
      automaticLayout: true,
      scrollBeyondLastLine: !fitHeight,
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

    let ignoreEvent = false;
    const onContentSizeSubscription = editor.current.onDidContentSizeChange(() => {
      if (!fitHeight) {
        return;
      }
      const contentHeight = editor.current.getContentHeight();
      setContentHeight(contentHeight);
      try {
        ignoreEvent = true;
        editor.current.layout({ width: node.offsetWidth, height: contentHeight });
      } finally {
        ignoreEvent = false;
      }
    });

    return () => {
      editor.current.dispose();
      editor.current = null;
      onEditSubscription.dispose();
      onContentSizeSubscription.dispose();
    }
  }, [node, fitHeight]);

  return <div className={cn(styles.editor, className)}
    style={style}
    ref={node => setNode(node)}
    {...props} />;
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
      { foreground: matColor('pink', 'a100'), token: "command" },
      { foreground: matColor('green', 'a200'), token: "func-name" },
      { foreground: matColor('cyan', 'a400'), token: "ident" },
      { foreground: matColor('indigo', '300'), token: "operator" },
      { foreground: matColor('deep-orange', 'a100'), token: "string" },
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
      ignoreCase: true,
      tokenizer: {
        root: [
          [/\b(\d*\.)?\d+\b|true|false|rows?|columns?/, "number"],
          [/(\s*(?:function|call)\s*)([a-z]\w*)/, ["keyword", "func-name"]],
          [/\s*\b(set|repeat|timer|if|else|function|end|call|and|or|not)\b\s*/, "keyword"],
          [/^\s*[a-z]\w*/, "command"],
          [/[a-z]\w*/, "ident"],
          [/"[^"]*"/, "string"],
          [/#.*$/, "comment"],
          [/\+|\-|\=|\*|\/|\(|\)|<=?|>=?/, "operator"],
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
            label: nearestNamedColor,
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