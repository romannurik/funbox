import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import useDebouncedEffect from 'use-debounced-effect';
import styles from './KidLangSandbox.module.scss';
import { KidLangTutorial } from "./KidLangTutorial";
import { SplitView } from "./SplitView";
import { CommandLine, DownChevron, Plus, Tag, Trash } from "./heroicons";
import { deleteProgram, onPrograms, saveProgram } from "./programstore";
import { CodeEditor } from "./CodeEditor";
import { Renderer } from "./Renderer";

const NEW_PROGRAM = {
  name: 'A new program!',
  code: '',
};

const LAST_PROGRAM_LOCAL_STORAGE_KEY = 'lastprogram';
const SESSION_ID = Math.floor(Math.random() * 899999 + 100000);

export function KidLangSandbox() {
  const [programs, setPrograms] = useState([]);
  const [currentProgram, setCurrentProgram] = useState({ ...NEW_PROGRAM });
  const [error, setError] = useState(null);
  const firstRun = useRef(true);

  useEffect(() => {
    let unsub = onPrograms(programs => {
      if (!programs.length) {
        programs = [{ ...NEW_PROGRAM }];
      }
      setPrograms(programs);
      if (firstRun.current) {
        let program = null;
        let lastProgramId = window.localStorage[LAST_PROGRAM_LOCAL_STORAGE_KEY];
        if (lastProgramId) {
          program = programs.find(({ id }) => id === lastProgramId);
        }
        setCurrentProgram(program || programs[0]);
      } else {
        let updatedProgram = programs.find(({ id }) => id === currentProgram.id);
        if (updatedProgram && updatedProgram.lastEditedBy !== SESSION_ID) {
          if (updatedProgram.code !== currentProgram.code ||
            updatedProgram.name !== currentProgram.name) {
            setCurrentProgram(updatedProgram);
          }
        }
      }
      firstRun.current = false;
    });
    return () => unsub();
  }, [currentProgram.id]);

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

  return <>
    <Helmet>
      <title>Kid Programming</title>
    </Helmet>
    <Router>
      <Switch>
        <Route path="/kidlang/tutorial" component={KidLangTutorial} />
        <Route>
          <SplitView
            className={styles.container}
            splitSaveKey="splitter"
            defaultSplit={0.333}
            left={<>
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
                    {!currentProgram.id && <option value="">{NEW_PROGRAM.name}</option>}
                    {programs
                      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                      .map(({ id, name }) =>
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
                      let nextProgram = programs.find(p => p.id !== currentProgram.id);
                      setCurrentProgram(nextProgram || { ...NEW_PROGRAM });
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
                onCodeChange={code => {
                  setCurrentProgram(prg => ({
                    ...prg,
                    code,
                    lastEditedBy: SESSION_ID,
                    _edit: code !== NEW_PROGRAM.code
                  }));
                }}
              />
            </>
            }
            right={
              <Renderer
                className={styles.renderer}
                onError={error => setError(error)}
                program={currentProgram.code || ''} />
            } />
        </Route>
      </Switch>
    </Router>
  </>;
}
