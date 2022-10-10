import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';
import React, { useEffect, useRef, useState } from "react";
import matColor from '../../material-colors';

export function CodeEditor({ code, error, onCodeChange, ...props }) {
  let [node, setNode] = useState(null);
  let editor = useRef(null);

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
      minimap: {
        enabled: false,
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
      onCodeChange && onCodeChange(editor.current.getValue());
    });
    return () => {
      editor.current.dispose();
      onEditSubscription.dispose();
    }
  }, [node]);

  return <div {...props} ref={node => setNode(node)} />;
}

function setupMonaco() {
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
  monaco.languages.setLanguageConfiguration('kid', {
    comments: {
      lineComment: '#',
    }
  });
  monaco.languages.setMonarchTokensProvider('kid', {
    tokenizer: {
      root: [
        [/\d+|ROWS?|COLUMNS?/, "number"],
        [/((?:FUNCTION|CALL)\s*)([a-z]\w*)/, ["keyword", "func-name"]],
        [/[A-Z]+/, "keyword"],
        [/[a-z]\w*/, "ident"],
        [/"[^"]*"/, "string"],
        [/#.*$/, "comment"],
        [/\+|\=/, "operator"],
      ],
    },
  });
}

setupMonaco();