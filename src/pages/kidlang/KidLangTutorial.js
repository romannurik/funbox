import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangTutorial.module.scss';
import { Renderer } from "./Renderer";
import { SplitView } from "./SplitView";
import ReactMarkdown from "react-markdown";
import content from './content';

const TutorialCodeContext = React.createContext({});

function TutorialPreComponent({ ...props }) {
  // TODO: this assumes there's only one editor
  let { error, onCode } = useContext(TutorialCodeContext);
  return <HastInlineCodeEditor error={error} onCode={onCode} {...props} />;
}

export function KidLangTutorial() {
  let [chapterNumber, setChapterNumber] = useState(0);
  let [pageNumber, setPageNumber] = useState(0);

  let [previewCode, setPreviewCode] = useState('');
  let [error, setError] = useState(null);

  let currentPageMarkdown = content[chapterNumber].pages[pageNumber];

  return <div className={styles.container}>
    <Helmet>
      <title>Kid Programming Tutorial</title>
    </Helmet>
    <TutorialCodeContext.Provider value={{
      error,
      onCode: setPreviewCode
    }}>
      <SplitView
        className={styles.main}
        splitSaveKey="splitter"
        left={<>
          {content.map(({ pages }, c) =>
            pages.map((_, p) =>
              <button
                key={`${p}.${c}`}
                onClick={() => {
                  setChapterNumber(c);
                  setPageNumber(p);
                }}>Chapter {c}, Page {p}</button>)
          )}
          <ReactMarkdown
            children={currentPageMarkdown}
            components={{
              // If we make a dynamic function here it becomes a full re-render
              pre: TutorialPreComponent
            }} />
        </>
        }
        right={
          <Renderer
            className={styles.renderer}
            onError={error => setError(error)}
            program={previewCode} />
        }
      />
    </TutorialCodeContext.Provider>
  </div>;
}

function HastInlineCodeEditor({ node: hastNode, error, onCode }) {
  let [editedCode, setEditedCode] = useState(null);

  let staticCode = useMemo(() => {
    return hastNode ? hastNodeTextContent(hastNode).trimEnd() : '';
  }, [hastNode]);

  let effectiveCode = editedCode === null ? staticCode : editedCode;

  useEffect(() => {
    onCode(effectiveCode);
  }, [effectiveCode]);

  return (
    <CodeEditor
      fitHeight
      error={error}
      code={effectiveCode}
      onCodeChange={code => setEditedCode(code)}
    />
  );
}

function hastNodeTextContent(hastNode) {
  // gather all text children in the AST to determine the code
  // this is usually really straightforward
  function walk(node) {
    if (node.type === "text") {
      return node.value;
    } else if (node.children) {
      return node.children.map(c => walk(c)).join("");
    }
    return "";
  };

  return walk(hastNode);
}
