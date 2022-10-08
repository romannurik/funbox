import React, { useEffect, useState } from "react";
import kid from "./kidlang";
import styles from './KidLangEditor.module.scss';
import cn from 'classnames';
import { CodeEditor } from "./CodeEditor";

const GRID_SIZE = 10;

export function Renderer({ program, onOutput, onError, ...props }) {
  const [canvas, setCanvas] = useState(null);

  useEffect(() => {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    let ctx = canvas.getContext('2d');
    let cellSize = Math.min(canvas.width, canvas.height) / (GRID_SIZE + 1);
    ctx.scale(cellSize, cellSize);
    ctx.translate(1, 1);

    const API = {
      LETTER(color, text, point) {
        ctx.save();
        ctx.scale(0.1, 0.1);
        ctx.font = '6px monospace';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(text || '').substring(0, 1),
          point.c * 10 + 5,
          point.r * 10 + 5);
        ctx.restore();
      },
      LINE(color, p1, ...points) {
        ctx.strokeStyle = color;
        ctx.fillStyle = 'transparent';
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.moveTo(p1.c + 0.5, p1.r + 0.5);
        for (let p of points) {
          ctx.lineTo(p.c + 0.5, p.r + 0.5);
        }
        ctx.stroke();
      },
      DOT(color, point) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(point.c + 0.5, point.r + 0.5, 0.2, 0.2, 0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      },
      CIRCLE(color, from, to) {
        ctx.strokeStyle = 'transparent';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(
          (from.c + to.c) / 2 + 0.5,
          (from.r + to.r) / 2 + 0.5,
          (Math.abs(to.c - from.c) + 1) / 2,
          (Math.abs(to.r - from.r) + 1) / 2,
          0, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      },
      RECTANGLE(color, from, to) {
        ctx.strokeStyle = 'transparent';
        ctx.fillStyle = color;
        ctx.fillRect(
          from.c,
          from.r,
          to.c - from.c + 1,
          to.r - from.r + 1);
      }
    };

    drawLabels();
    try {
      onOutput(kid.run(program, (cmd, ...args) => {
        if (!API[cmd]) {
          onError(`I don't know the command: "${cmd}"`);
        }

        API[cmd](...args);
      }));
    } catch (e) {
      onError(e.toString());
      console.error(e);
    }
    drawGridlines();

    function drawGridlines() {
      drawGrid('rgba(255,255,255,.4)');
      drawGrid('rgba(0,0,0,.25)');
    }

    function drawLabels() {
      ctx.save();
      ctx.scale(0.1, 0.1);
      ctx.font = '6px monospace';
      for (let r = 0; r < GRID_SIZE; r++) {
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String.fromCharCode('A'.charCodeAt(0) + r),
          (r + 0.5) * 10,
          -0.5 * 10);
        ctx.fillText(
          (r + 1),
          -0.5 * 10,
          (r + 0.5) * 10);
      }
      ctx.restore();
    }

    function drawGrid(color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / cellSize;
      ctx.beginPath();
      for (let r = 0; r < GRID_SIZE + 1; r++) {
        ctx.moveTo(r, 0);
        ctx.lineTo(r, GRID_SIZE);
        ctx.moveTo(0, r);
        ctx.lineTo(GRID_SIZE, r);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }, [canvas, program]);

  return (
    <canvas {...props} ref={node => setCanvas(node)} />
  );
}