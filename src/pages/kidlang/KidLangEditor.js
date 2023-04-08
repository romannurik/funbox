import React, { useEffect, useState } from "react";
import useDebouncedEffect from 'use-debounced-effect';
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangEditor.module.scss';
import { Renderer } from "./Renderer";
import { deleteProgram, onPrograms, saveProgram } from "./programstore";
import { CommandLine, DownChevron, Plus, Tag, Trash } from "./heroicons";

const NEW_PROGRAM = {
  name: 'A new program!',
  code: '',
};

const LAST_PROGRAM_LOCAL_STORAGE_KEY = 'lastprogram';


export function KidLangEditor() {
  const [programs, setPrograms] = useState([]);
  const [currentProgram, setCurrentProgram] = useState({ ...NEW_PROGRAM });
  // const [prog, setProg] = useState(window.localStorage.PROGRAM || '');
  const [output, setOutput] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let first = true;
    let unsub = onPrograms(programs => {
      if (!programs.length) {
        programs = [{ ...NEW_PROGRAM }];
      }
      setPrograms(programs);
      if (first) {
        let program = null;
        let lastProgramId = window.localStorage[LAST_PROGRAM_LOCAL_STORAGE_KEY];
        if (lastProgramId) {
          program = programs.find(({ id }) => id === lastProgramId);
        }
        setCurrentProgram(program || programs[0]);
      }
      first = false;
    });
    return () => unsub();
  }, []);

  useDebouncedEffect(() => {
    if (!currentProgram._edit) {
      return;
    }

    (async () => {
      let { id } = await saveProgram(currentProgram);
      if (!currentProgram.id) {
        setCurrentProgram(prg => ({ ...prg, id }));
      }
    })();
  }, 1000, [currentProgram]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button className={styles.iconButton}
          title="New program"
          aria-label="New program"
          onClick={async () => {
            setCurrentProgram({ ...NEW_PROGRAM });
          }}>
          <Plus />
        </button>
        <div className={styles.programPicker}>
          <CommandLine />
          <select value={currentProgram.id || ''}
            onChange={ev => {
              let selected = ev.currentTarget.value;
              let foundProgram = programs.find(({ id }) => id === selected);
              if (foundProgram) {
                setCurrentProgram(foundProgram);
                window.localStorage[LAST_PROGRAM_LOCAL_STORAGE_KEY] = selected;
              }
            }}>
            {!currentProgram.id && <option value="">-- New program --</option>}
            {programs.map(({ id, name }) =>
              <option
                key={id || '--'}
                value={id}>{name}</option>)}
          </select>
          <DownChevron />
        </div>
        <button className={styles.iconButton}
          title="Rename"
          aria-label="Rename"
          onClick={async () => {
            let name = window.prompt('Pick a new name', currentProgram.name);
            if (name) {
              setCurrentProgram(prg => ({ ...prg, name, _edit: true }));
            }
          }}>
          <Tag />
        </button>
        <button className={styles.iconButton}
          title="Delete program"
          aria-label="Delete program"
          onClick={async () => {
            if (window.confirm('Really delete this?')) {
              setCurrentProgram(programs[0] || { ...NEW_PROGRAM });
              await deleteProgram(currentProgram.id);
            }
          }}>
          <Trash />
        </button>
      </div>
      <CodeEditor
        className={styles.editor}
        error={error}
        code={currentProgram.code || ''}
        onCodeChange={async code => {
          setCurrentProgram(prg => ({ ...prg, code, _edit: code !== NEW_PROGRAM.code }));
        }}
      />
      <Renderer
        className={styles.renderer}
        onOutput={output => setOutput(output)}
        onError={error => setError(error)}
        program={currentProgram.code} />
      <pre className={styles.log}>
        {output}
      </pre>
    </div>
  );
}
