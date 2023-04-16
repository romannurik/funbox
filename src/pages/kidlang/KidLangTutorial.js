import React, { useContext, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet";
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangTutorial.module.scss';
import { Renderer } from "./Renderer";
import { SplitView } from "./SplitView";
import ReactMarkdown from "react-markdown";
import chp1 from '!!raw-loader!./tutorial/chapter1.md';

let chp1Sections = chp1.split(/\s*---+\s*/ms);

const TutorialCodeContext = React.createContext({});

function TutorialPreComponent({ ...props }) {
  // TODO: this assumes there's only one editor
  let { error, onCode } = useContext(TutorialCodeContext);
  return <HastInlineCodeEditor error={error} onCode={onCode} {...props} />;
}

export function KidLangTutorial() {
  let [code, setCode] = useState('');
  let [error, setError] = useState(null);
  let [sectionNumber, setSectionNumber] = useState(0);

  return <div className={styles.container}>
    <Helmet>
      <title>Kid Programming Tutorial</title>
    </Helmet>
    <TutorialCodeContext.Provider value={{
      error,
      onCode: setCode
    }}>
      <SplitView
        className={styles.main}
        splitSaveKey="splitter"
        left={<>
          {Array(chp1Sections.length).fill(0).map((_, idx) =>
            <button key={idx} onClick={() => setSectionNumber(idx)}>Sec {idx}</button>
          )}
          <ReactMarkdown
            children={chp1Sections[sectionNumber]}
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
            program={code} />
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
