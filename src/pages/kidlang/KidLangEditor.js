import React, { useEffect, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangEditor.module.scss';
import { Renderer } from "./Renderer";

export function KidLangEditor() {
  const [prog, setProg] = useState(window.localStorage.PROGRAM || '');
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    window.localStorage.PROGRAM = prog;
  }, [prog]);

  return (
    <div className={styles.container}>
      <CodeEditor
        className={styles.editor}
        error={error}
        code={prog}
        onCodeChange={code => setProg(code)}
      />
      <Renderer
        className={styles.renderer}
        onOutput={output => setOutput(output)}
        onError={error => setError(error)}
        program={prog} />
      <pre className={styles.log}>
        {output}
      </pre>
    </div>
  );
}
