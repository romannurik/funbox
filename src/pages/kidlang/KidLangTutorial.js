import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangTutorial.module.scss';
import { Renderer } from "./Renderer";
import { SplitView } from "./SplitView";

export function KidLangTutorial() {
  let [code, setCode] = useState(`set foo = true\nif foo\n  dot red a1\nend`);
  let [error, setError] = useState(null);
  return <div className={styles.container}>
    <Helmet>
      <title>Kid Programming Tutorial</title>
    </Helmet>
    <SplitView
      className={styles.main}
      splitSaveKey="splitter"
      left={<>
        <h1>Intro to programming</h1>
        <p>A long time ago blah blah</p>
        <CodeEditor
          fitHeight
          code={code}
          error={error}
          onCodeChange={code => {
            setCode(code);
          }}
        />
        {/* <KidLangEditor tutorialMode code={`dot red a1`} /> */}
        <p>Hello hello more stuff</p>
        <p>Then there were if statements</p>
        {/* <KidLangEditor tutorialMode code={`set foo = true\nif foo\n  dot red a1\nend`} /> */}
      </>
      }
      right={
        <Renderer
          className={styles.renderer}
          onError={error => setError(error)}
          program={code} />
      }
    />
  </div>;
}