import React, { useEffect, useState } from "react";
import kid from "./kidlang";
import styles from './KidLangEditor.module.scss';
import cn from 'classnames';
import { CodeEditor } from "./CodeEditor";
import { Renderer } from "./Renderer";

export function KidLangEditor() {
  const [prog, setProg] = useState(window.localStorage.PROGRAM || '');
  const [output, setOutput] = useState('');

  useEffect(() => {
    window.localStorage.PROGRAM = prog;
  }, [prog]);

  return (
    <div className={styles.container}>
      <CodeEditor
        className={styles.editor}
        code={prog}
        onCodeChange={code => setProg(code)}
      />
      <Renderer
        className={styles.renderer}
        onOutput={output => setOutput(output)}
        onError={error => setOutput(error)}
        program={prog} />
      <pre className={styles.log}>
        {output}
      </pre>
    </div>
  );
}
