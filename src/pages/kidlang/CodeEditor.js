import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import React, { useEffect, useRef, useState } from "react";
import matColor from '../../material-colors';
import styles from './KidLangEditor.module.scss';

export function CodeEditor({ code, error, onCodeChange, ...props }) {
  let [node, setNode] = useState(null);
  let editor = useRef(null);

  useEffect(() => {
    if (!editor.current) {
      return;
    }
    if (!error) {
      monaco.editor.setModelMarkers(
        editor.current.getModel(),
        'main', []);
      return;
    }

    const model = editor.current.getModel();
    const position = model.getPositionAt(error.position);
    const endPosition = error.endPosition
      ? model.getPositionAt(error.endPosition)
      : model.getPositionAt(error.position + 1);
    monaco.editor.setModelMarkers(
      editor.current.getModel(),
      'main',
      [
        {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: endPosition.lineNumber,
          endColumn: endPosition.column,
          message: 'hey there',
          severity: monaco.MarkerSeverity.Error,
          // code: 'hey',
          // source: 'blah',
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
      // fontFamily: 'var(--font-stack-code)',
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
      { foreground: "7285b7", token: "comment" },
      { foreground: matColor('pink', 'a100', true), token: "keyword" },
      { foreground: matColor('cyan', '300', true), token: "ident" },
      { foreground: matColor('blue-grey', '300'), token: "operator" },
      { foreground: matColor('deep-orange', 'a100'), token: "string" },
      { foreground: matColor('yellow', '600'), token: "number" },
    ],
    colors: {
      "editor.foreground": "#FFFFFF",
      "editor.background": "#162b4b",
      "editor.selectionBackground": '#ffffff20',
      "editor.lineHighlightBackground": "#ffffff10",
      "editorLineNumber.foreground": "#ffffff20",
      "editor.foldBackground": "#ffffffff",
      "editorCursor.foreground": "#FFFFFF",
      "editorIndentGuide.background": "#ffffff10",
      "editorWhitespace.foreground": "#ffffff00"
    }
  });
  monaco.languages.register({ id: 'kid' });
  monaco.languages.setMonarchTokensProvider('kid', {
    tokenizer: {
      root: [
        [/\d+|ROWS?|COLUMNS?/, "number"],
        [/[A-Z]+/, "keyword"],
        [/[a-z]\w*/, "ident"],
        [/"[^"]*"/, "string"],
        [/\+|\=/, "operator"],
      ],
      // linecontent: monacoMarkdown.language.tokenizer.linecontent
      //   .filter(x => !Array.isArray(x) || x[1] != 'string.target'),
    },
  });
}

setupMonaco();