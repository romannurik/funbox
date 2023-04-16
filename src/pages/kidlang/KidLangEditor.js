import React, { useRef, useState } from "react";
import { CodeEditor } from "./CodeEditor";
import styles from './KidLangEditor.module.scss';
import { Renderer } from "./Renderer";

const SPLITTER_LOCAL_STORAGE_KEY = 'splitter';

export function KidLangEditor({ toolbar, tutorialMode, code, onChange }) {
  const [editedCode, setEditedCode] = useState(code);
  const [error, setError] = useState(null);
  const [splitPosition, setSplitPosition] = useState(window.localStorage[SPLITTER_LOCAL_STORAGE_KEY] || 0.333);

  return <>
    <div className={styles.container} style={{
      '--split-position': Math.max(0.25, Math.min(splitPosition, 0.75)),
    }}>
      <div className={styles.leftPane}>
        {!!toolbar && <div className={styles.toolbar}>
          {toolbar}
        </div>}
        <CodeEditor
          className={styles.editor}
          error={error}
          code={(tutorialMode ? editedCode : code) || ''}
          onCodeChange={code => {
            onChange && onChange(code);
            if (tutorialMode) {
              setEditedCode(code);
            }
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
        program={(tutorialMode ? editedCode : code) || ''} />
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