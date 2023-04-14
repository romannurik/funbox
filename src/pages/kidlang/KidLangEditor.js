import React, { useEffect, useRef, useState } from "react";
import useDebouncedEffect from 'use-debounced-effect';
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangEditor.module.scss';
import { Renderer } from "./Renderer";
import { deleteProgram, onPrograms, saveProgram } from "./programstore";
import { CommandLine, DownChevron, Plus, Tag, Trash } from "./heroicons";
import { Helmet } from "react-helmet";

const NEW_PROGRAM = {
  name: 'A new program!',
  code: '',
};

const LAST_PROGRAM_LOCAL_STORAGE_KEY = 'lastprogram';
const SPLITTER_LOCAL_STORAGE_KEY = 'splitter';
const SESSION_ID = Math.floor(Math.random() * 899999 + 100000);

export function KidLangEditor() {
  const [programs, setPrograms] = useState([]);
  const [currentProgram, setCurrentProgram] = useState({ ...NEW_PROGRAM });
  const [error, setError] = useState(null);
  const firstRun = useRef(true);
  const [splitPosition, setSplitPosition] = useState(window.localStorage[SPLITTER_LOCAL_STORAGE_KEY] || 0.333);

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
    <div className={styles.container} style={{
      '--split-position': Math.max(0.25, Math.min(splitPosition, 0.75)),
    }}>
      <div className={styles.leftPane}>
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
          onCodeChange={async code => {
            setCurrentProgram(prg => ({
              ...prg,
              code,
              lastEditedBy: SESSION_ID,
              _edit: code !== NEW_PROGRAM.code
            }));
          }}
        />
      </div>
      <Splitter position={splitPosition} onChange={pos => {
        pos = pos.toFixed(3);
        setSplitPosition(pos);
        window.localStorage[SPLITTER_LOCAL_STORAGE_KEY] = pos;
      }} />
      <Renderer
        className={styles.renderer}
        onError={error => setError(error)}
        program={currentProgram.code} />
    </div>
  </>;
}

function Splitter({ position, onChange }) {
  let splitterRef = useRef(null);

  let handlePointerDown = ev => {
    let splitterWidth = splitterRef.current.offsetWidth;
    let containerBounds = splitterRef.current.parentNode.getBoundingClientRect();
    let scrim = document.createElement('div');
    scrim.setAttribute('style', `
      position: fixed; left: 0; top: 0; right: 0; bottom: 0;
      z-index: 9999;
      cursor: -webkit-grabbing;
    `);
    document.body.appendChild(scrim);
    let move_ = ev => {
      let pos = ((ev.clientX - splitterWidth / 2) - containerBounds.left) / (containerBounds.width - splitterWidth);
      onChange(pos);
    };
    let up_ = ev => {
      window.removeEventListener('pointermove', move_);
      window.removeEventListener('pointerup', up_);
      window.removeEventListener('pointercancel', up_);
      document.body.removeChild(scrim);
    };

    window.addEventListener('pointermove', move_);
    window.addEventListener('pointerup', up_);
    window.addEventListener('pointercancel', up_);
  };

  return <div ref={splitterRef} className={styles.splitter}
    onPointerDown={handlePointerDown}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  </div>;
}