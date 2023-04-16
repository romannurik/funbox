import React, { useRef, useState } from "react";
import styles from './SplitView.module.scss';
import cn from 'classnames';

export function SplitView({ left, right, splitSaveKey, defaultSplit, className, ...props }) {
  const [splitPosition, setSplitPosition] = useState(
    (splitSaveKey ? window.localStorage[splitSaveKey] : null)
    || defaultSplit
    || 0.5);

  return <div
    className={cn(styles.splitView, className)}
    style={{
      '--split-position': Math.max(0.25, Math.min(splitPosition, 0.75)),
    }}
    {...props}>
    <div className={styles.left}>{left}</div>
    <Splitter position={splitPosition} onChange={pos => {
      pos = pos.toFixed(3);
      setSplitPosition(pos);
      if (splitSaveKey) {
        window.localStorage[splitSaveKey] = pos;
      }
    }} />
    <div className={styles.right}>{right}</div>
  </div>;
}

function Splitter({ onChange }) {
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