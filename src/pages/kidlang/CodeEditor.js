import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';
import React, { useEffect, useRef, useState } from "react";
import matColor from '../../material-colors';
import { NAMED_COLORS, findNearestNamedColor } from './colors';
import colornames from 'colornames';
import tinycolor from 'tinycolor2';
import { MoonIcon } from '@primer/octicons-react';

export function CodeEditor({ code, error, onCodeChange, ...props }) {
  let [node, setNode] = useState(null);
  let editor = useRef(null);
  let onCodeChangeRef = useRef(onCodeChange);

  useEffect(() => {
    let dispose = setupMonaco();
    return () => dispose();
  }, []);

  useEffect(() => {
    if (!editor.current) {
      return;
    }
    let model = editor.current.getModel();
    let curValue = model.getValue();
    if (curValue !== code) {
      model.setValue(code);
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
      onCodeChangeRef.current && onCodeChangeRef.current(editor.current.getValue());
    });
    return () => {
      editor.current.dispose();
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
  );

  return () => {
    for (let disposable of disposables) {
      disposable?.dispose();
    }
  };
}
