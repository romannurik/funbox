import React, { useEffect, useRef, useState } from "react";
import tinycolor from "tinycolor2";
import { NAMED_COLORS } from "./colors";
import { start, vector } from "./kidlang";
import styles from './Renderer.module.scss';
import cn from 'classnames';

const GRID_SIZE = 10;
const CODE_FONT = '"DM Mono", monospace';
const MARGIN = 10;
const CORNER_RADIUS = 0.2;

export function Renderer({ className, style, program, onOutput, onError, ...props }) {
  const containerRef = useRef(null);
  const runnerRef = useRef(null);
  const [runnerCanvas, setRunnerCanvas] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [rerenderToken, setRerenderToken] = useState(0);
  const [containerSize, setContainerSize] = useState(null);

  // Watch for resize on render canvas
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setContainerSize(containerRef.current?.offsetWidth + 'x' +
        containerRef.current?.offsetHeight);
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    }
  }, [containerRef.current]);

  // Manage a program runner and off-screen runner canvas
  useEffect(() => {
    onError(null);
    let ctx = document.createElement('canvas').getContext('2d');
    ctx.canvas.width = 1000; // TODO: dynamic
    ctx.canvas.height = 1000;
    setRunnerCanvas(ctx.canvas);
    let cellSize = ctx.canvas.width / GRID_SIZE;
    ctx.scale(cellSize, cellSize);
    let API = drawingApiForCanvas(ctx, () => setRerenderToken(t => t + 1));
    let r = runnerRef.current = start(program, {
      globals: {
        ...makeInitialVars(),
        ...makeInitialFuncs(),
      },
      onError(e) {
        onError(e);
        console.info('Program error:', e);
      },
      async onCommand(cmd, ...args) {
        if (!API[cmd]) {
          throw new Error(`I don't know the command: "${cmd}"`);
        }

        let api = (typeof API[cmd] === 'function')
          ? {
            fn: API[cmd],
            minArgs: API[cmd].length,
            variadic: false,
          } : API[cmd];

        if (api.variadic) {
          if (args.length < api.minArgs) {
            throw new Error(`${cmd} expects at least ${api.minArgs} parameters`);
          }
        } else {
          if (args.length !== api.minArgs) {
            throw new Error(`${cmd} expects exactly ${api.minArgs} parameters`);
          }
        }

        try {
          ctx.save();
          await api.fn(...args);
        } finally {
          ctx.restore();
        }
      }
    });

    return () => {
      if (runnerRef.current === r) runnerRef.current = null;
      r.stop();
    };
  }, [program]);

  // Render the offscreen canvas + frills to the render canvas
  useEffect(async () => {
    if (!canvas || !containerRef.current || !runnerCanvas) return;

    let compStyle = window.getComputedStyle(containerRef.current);
    let labelColor = compStyle.getPropertyValue('--label-color');
    let gridColor = compStyle.getPropertyValue('--grid-color');
    let gridColor30 = tinycolor(gridColor).setAlpha(0.3).toRgbString();

    let size = Math.min(containerRef.current.offsetWidth, containerRef.current.offsetHeight) - MARGIN * 2;
    canvas.width = canvas.height = size * 2;
    canvas.style.width = canvas.style.height = `${size}px`;
    let cellSize = canvas.width / (GRID_SIZE + 2);
    let ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(cellSize, cellSize);
    ctx.translate(1, 1);

    drawLabels();
    drawGrid(gridColor);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, GRID_SIZE, GRID_SIZE, CORNER_RADIUS);
    ctx.clip();
    ctx.drawImage(runnerCanvas,
      0, 0, runnerCanvas.width, runnerCanvas.height,
      0, 0, GRID_SIZE, GRID_SIZE);
    ctx.restore();
    drawGrid(gridColor30);
    ctx.restore();

    function drawLabels() {
      ctx.save();
      ctx.scale(0.1, 0.1);
      ctx.font = `4px ${CODE_FONT}`;
      for (let r = 0; r < GRID_SIZE; r++) {
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String.fromCharCode('A'.charCodeAt(0) + r),
          (r + 0.5) * 10,
          -0.5 * 10);
        ctx.fillText(
          String.fromCharCode('A'.charCodeAt(0) + r),
          (r + 0.5) * 10,
          10.5 * 10);
        ctx.fillText(
          (r + 1),
          -0.5 * 10,
          (r + 0.5) * 10);
        ctx.fillText(
          (r + 1),
          10.5 * 10,
          (r + 0.5) * 10);
      }
      ctx.restore();
    }

    function drawGrid(color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2 / cellSize;
      ctx.beginPath();
      for (let r = 1; r < GRID_SIZE; r++) {
        ctx.moveTo(r, 0);
        ctx.lineTo(r, GRID_SIZE);
        ctx.moveTo(0, r);
        ctx.lineTo(GRID_SIZE, r);
      }
      ctx.roundRect(0, 0, GRID_SIZE, GRID_SIZE, CORNER_RADIUS);
      ctx.stroke();
    }
  }, [runnerCanvas, canvas, rerenderToken, containerSize]);

  function hitTest(x, y) {
    if (!canvas) return {};
    return {
      c: Math.floor(x * (GRID_SIZE + 2) / canvas.offsetWidth) - 1,
      r: Math.floor(y * (GRID_SIZE + 2) / canvas.offsetWidth) - 1
    };
  }

  function mouseEvent(ev, type) {
    if (type !== 'down') return;
    let bounds = ev.currentTarget.getBoundingClientRect();
    let { r, c } = hitTest(ev.clientX - bounds.left, ev.clientY - bounds.top);
    if (!runnerRef.current || r == undefined || c === undefined) {
      return;
    }
    runnerRef.current.fireEvent('click', vector(r, c));
  }

  return <div ref={containerRef} className={cn(styles.renderer, className)} {...props}>
    <canvas ref={node => setCanvas(node)}
      onPointerDown={ev => mouseEvent(ev, 'down')}
      onPointerMove={ev => mouseEvent(ev, 'move')}
      onPointerUp={ev => mouseEvent(ev, 'up')} />
  </div>;
}

function drawingApiForCanvas(ctx, onCommandRun) {
  return {
    CLEAR() {
      ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
      onCommandRun();
    },
    LETTER(color, text, point) {
      ctx.scale(0.1, 0.1);
      ctx.font = `6px ${CODE_FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String(text || '').substring(0, 1),
        point.c * 10 + 5,
        point.r * 10 + 5);
      onCommandRun();
    },
    TEXT(color, text, start) {
      ctx.scale(0.1, 0.1);
      ctx.font = `6px ${CODE_FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      text = String(text || '');
      for (let i = 0; i < text.length; i++) {
        ctx.fillText(
          text.charAt(i),
          (start.c + i) * 10 + 5,
          start.r * 10 + 5);
      }
      onCommandRun();
    },
    LINE: {
      variadic: true,
      minArgs: 2,
      fn: (color, p1, ...points) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = 'transparent';
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.moveTo(p1.c + 0.5, p1.r + 0.5);
        for (let p of points) {
          ctx.lineTo(p.c + 0.5, p.r + 0.5);
        }
        ctx.stroke();
        onCommandRun();
      }
    },
    POLYGON: {
      variadic: true,
      minArgs: 2,
      fn: (color, p1, ...points) => {
        ctx.strokeStyle = color;
        ctx.fillStyle = 'transparent';
        ctx.lineWidth = 0.2;
        ctx.beginPath();
        ctx.moveTo(p1.c + 0.5, p1.r + 0.5);
        for (let p of points) {
          ctx.lineTo(p.c + 0.5, p.r + 0.5);
        }
        ctx.closePath();
        ctx.stroke();
        onCommandRun();
      }
    },
    DOT(color, point) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(point.c + 0.5, point.r + 0.5, 0.2, 0.2, 0, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      onCommandRun();
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
      onCommandRun();
    },
    RECTANGLE(color, from, to) {
      ctx.strokeStyle = 'transparent';
      ctx.fillStyle = color;
      ctx.fillRect(
        from.c,
        from.r,
        to.c - from.c + 1,
        to.r - from.r + 1);
      onCommandRun();
    }
  };
}

function makeInitialVars() {
  const colors = Object.fromEntries(NAMED_COLORS.map(x => [x.toLocaleLowerCase(), x]));
  const positions = {};
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      // e.g. a1 = {r:0,c:0}
      positions[String.fromCharCode(97 + c) + (r + 1)] = vector(r, c);
    }
  }
  return { ...colors, ...positions, stopsign: true };
}

function makeInitialFuncs() {
  const nc = NAMED_COLORS;
  return {
    randomcolor: () => {
      return nc[Math.floor(Math.random() * nc.length)].toLocaleLowerCase()
    }
  };
}
