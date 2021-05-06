import { ArrowUpIcon, ReplyIcon } from "@primer/octicons-react";
import cn from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { roundRect } from "./canvas-util";
import { Message } from "./Message";
import { TurnAroundIcon } from "./MoreIcons";
import styles from "./RobotGame.module.scss";

const SPEED = 300;
const COLORMAP = {
  blue: "deepskyblue",
  red: "tomato",
  purple: "#9f57eb"
};
const DIRS = ["l", "d", "r", "u"];
const DIR_DELTAS = {
  l: { x: -1, y: 0 },
  d: { x: 0, y: 1 },
  r: { x: 1, y: 0 },
  u: { x: 0, y: -1 }
};
const ACTIONS = ["", "turn-left", "turn-right", "turn-around"];
const ACTION_ICONS = {
  "": ArrowUpIcon,
  "turn-left": ReplyIcon,
  "turn-right": FlippedReplyIcon,
  "turn-around": TurnAroundIcon
};
const ROTATIONS = {
  l: Math.PI,
  d: Math.PI / 2,
  r: 0,
  u: (Math.PI * 3) / 2
};
const CANVAS_MARGIN = 4;
const CANVAS_SIZE = 800;

export function Game({ className, level, onAdvanceToNextLevel, onCellClick }) {
  let [running, setRunning] = useState(false);
  let [engineLevel, setEngineLevel] = useState(level);
  let [userProgram, setUserProgram] = useState({});
  let [message, setMessage] = useState(null);
  let [levelCompleted, setLevelCompleted] = useState(false);

  let resetState = () => setEngineLevel({ ...level });

  function handleGoButton() {
    setRunning(!running);
    setMessage(null);
    resetState();
  }

  function handleLevelCompleted() {
    setRunning(false);
    setLevelCompleted(true);
    if (level.doneText) {
      setMessage({
        text: level.doneText,
        button: 'Next level',
        buttonNextLevel: true,
      });
    }
  }

  useEffect(() => {
    setRunning(false);
    setEngineLevel(level);
    setLevelCompleted(false);
    if (level.startText) {
      setMessage({
        text: level.startText,
        button: 'Let\'s go',
      });
    }
    let p = {};
    for (let b of level.blocks || []) {
      p[b.color] = "";
    }
    setUserProgram(p);
  }, [level]);

  return (
    <div className={cn(styles.gameUI, className)}>
      <div className={styles.controlPanel}>
        {!levelCompleted && (
          <button
            className={cn(styles.goButton, { [styles.primary]: !running && !message })}
            onClick={handleGoButton}
          >
            {running ? "Stop" : "Go"}
          </button>
        )}
        {levelCompleted && (
          <button className={cn({ [styles.primary]: !message })} onClick={onAdvanceToNextLevel}>
            Next level
          </button>
        )}
        {Object.entries(userProgram).map(([color, action = ""]) => {
          const ActionIcon = ACTION_ICONS[action];
          return (
            <button
              key={color}
              className={cn(styles.instruction, {
                [styles.primary]: !!action
              })}
              style={{
                "--color": COLORMAP[color] || color
              }}
              onClick={ev => {
                setRunning(false);
                setMessage(null);
                resetState();
                setUserProgram({
                  ...userProgram,
                  [color]:
                    ACTIONS[(ACTIONS.indexOf(action) + 1) % ACTIONS.length]
                });
              }}
            >
              <span className={styles.instructionColor}>
                {titleCase(color)}
              </span>
              <span className={styles.instructionValue}>
                <ActionIcon size="36" />
              </span>
            </button>
          );
        })}
      </div>
      <div className={styles.gameBoardContainer}>
        {message && (
          <Message className={styles.message} show={true}
            button={
              <button className={styles.primary} onClick={() => {
                setMessage(null);
                message.buttonNextLevel && onAdvanceToNextLevel();
              }}>
                {message.button}
              </button>
            }>
            {message.text}
          </Message>
        )}
        <GameEngine
          level={engineLevel}
          userProgram={userProgram}
          onLevelCompleted={handleLevelCompleted}
          onCellClick={onCellClick}
          running={running}
        />
      </div>
    </div>
  );
}

/**
 * The game renderer + game engine that triggers updates to the game state
 * as the game runs.
 */
function GameEngine({
  level,
  userProgram,
  running,
  onLevelCompleted,
  onCellClick = () => { }
}) {
  let canvasRef = useRef();
  let engineState = useRef(null);

  useEffect(() => {
    engineState.current = {
      gameState: JSON.parse(JSON.stringify(level)),
      lastTick: 0,
      overrideNextTick: null,
      onNextTick: []
    };
  }, [level]);

  useEffect(() => {
    if (!engineState.current) {
      return;
    }

    let continueRendering = running;

    function render() {
      let { gameState, lastTick } = engineState.current;
      let canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      let ctx = canvas.getContext("2d");
      ctx.translate(CANVAS_MARGIN, CANVAS_MARGIN);
      ctx.scale(
        (canvas.width - CANVAS_MARGIN * 2) / gameState.gridSize,
        (canvas.height - CANVAS_MARGIN * 2) / gameState.gridSize
      );

      let t = (Date.now() - lastTick) / SPEED;
      if (t >= 1) {
        continueRendering && tick();
        t = 0;
      }

      drawGrid();
      drawBlocks();
      drawCoins();
      drawGoal();
      drawWalls();
      drawRobot();

      if (continueRendering) {
        requestAnimationFrame(render);
      }

      function drawRobot() {
        let { x: lastX, y: lastY, dir: lastDir } = gameState.robot;
        if (gameState.lastRobot) {
          ({ x: lastX, y: lastY, dir: lastDir } = gameState.lastRobot);
        }
        let { x, y, dir } = gameState.robot;
        ctx.save();
        ctx.translate(lerp(lastX, x, t) + 0.5, lerp(lastY, y, t) + 0.5);
        let lastRot = ROTATIONS[lastDir];
        let newRot = ROTATIONS[dir];
        if (newRot < lastRot - Math.PI) {
          newRot += Math.PI * 2;
        } else if (newRot > lastRot + Math.PI) {
          newRot -= Math.PI * 2;
        }
        let rot = lerp(lastRot, newRot, t);
        if (lastDir === dir) {
          rot += ((Math.sin(t * Math.PI * 2) * Math.PI) / 2) * 0.2;
        }
        ctx.rotate(rot);
        ctx.beginPath();
        roundRect(ctx, -0.5, -0.5, 0.9, 1, {
          tl: 0.5,
          tr: 0.2,
          bl: 0.5,
          br: 0.2
        });
        ctx.fillStyle = "#79a";
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(0.2, -0.15, 0.2, 0, Math.PI * 2, 0);
        ctx.arc(0.2, 0.15, 0.2, 0, Math.PI * 2, 0);
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(0.25, -0.15, 0.1, 0, Math.PI * 2, 0);
        ctx.arc(0.25, 0.15, 0.1, 0, Math.PI * 2, 0);
        ctx.fill();
        // if (gameState.coinsCollected) {
        //   ctx.fillStyle = "orange";
        //   for (let i = 0; i < gameState.coinsCollected; i++) {
        //     ctx.beginPath();
        //     ctx.arc(
        //       -0.3 + Math.abs(1 - i) * 0.1,
        //       0.25 * (1 - i),
        //       0.1,
        //       0,
        //       Math.PI * 2,
        //       0
        //     );
        //     ctx.fill();
        //   }
        // }
        ctx.restore();
      }

      function drawBlocks() {
        for (let { x, y, color } of gameState.blocks || []) {
          ctx.fillStyle = COLORMAP[color] || color;
          ctx.beginPath();
          ctx.arc(x + 0.5, y + 0.5, 0.4, 0, Math.PI * 2, 1);
          ctx.fill();
        }
      }

      function drawCoins() {
        for (let { x, y } of gameState.coins || []) {
          ctx.fillStyle = "orange";
          ctx.beginPath();
          ctx.arc(x + 0.5, y + 0.5, 0.2, 0, Math.PI * 2, 1);
          ctx.fill();
        }
      }

      function drawWalls() {
        for (let { x, y } of gameState.walls || []) {
          ctx.clearRect(x, y, 1, 1);
        }
      }

      function drawGoal() {
        const OFF_COLOR = "rgba(255,255,255,0.2)";
        let { x, y, coinsNeeded = 0 } = gameState.goal;
        let { coinsCollected = 0 } = gameState;
        ctx.lineWidth = 0.1;
        let done = coinsCollected >= coinsNeeded;
        ctx.strokeStyle = done ? "mediumseagreen" : OFF_COLOR;
        ctx.beginPath();
        ctx.ellipse(x + 0.5, y + 0.5, 0.4, 0.4, 0, Math.PI * 2, 0);
        ctx.stroke();
        ctx.strokeStyle = done
          ? "mediumseagreen"
          : coinsCollected >= 2
            ? "orange"
            : OFF_COLOR;
        ctx.beginPath();
        ctx.ellipse(x + 0.5, y + 0.5, 0.25, 0.25, 0, Math.PI * 2, 0);
        ctx.stroke();
        ctx.strokeStyle = done
          ? "mediumseagreen"
          : coinsCollected >= 1
            ? "orange"
            : OFF_COLOR;
        ctx.beginPath();
        ctx.ellipse(x + 0.5, y + 0.5, 0.1, 0.1, 0, Math.PI * 2, 0);
        ctx.stroke();
      }

      function drawGrid() {
        ctx.fillStyle = "#355382";
        ctx.fillRect(0, 0, gameState.gridSize, gameState.gridSize);
        ctx.fillStyle = "#406091";
        for (let x = 0; x < gameState.gridSize; x++) {
          for (let y = 0; y < gameState.gridSize; y++) {
            if ((x + y) % 2 === 0) {
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
      }
    }

    function tick() {
      if (!continueRendering) {
        return;
      }

      let { gameState, onNextTick, overrideNextTick } = engineState.current;

      gameState.lastRobot = { ...gameState.robot };
      engineState.current.lastTick = Date.now();

      if (overrideNextTick) {
        overrideNextTick();
        engineState.current.overrideNextTick = null;
        return;
      }

      if (onNextTick.length) {
        for (let f of onNextTick) {
          f();
        }
        engineState.current.onNextTick = [];
      }

      let { x, y, dir } = gameState.robot;
      let newX = x + DIR_DELTAS[dir].x;
      let newY = y + DIR_DELTAS[dir].y;
      let moveForward = true;

      detectGoal();
      detectBlocks();
      detectWalls();
      detectCoins();

      gameState.robot = {
        x: moveForward ? newX : x,
        y: moveForward ? newY : y,
        dir
      };

      function detectGoal() {
        if (
          newX === gameState.goal.x &&
          newY === gameState.goal.y &&
          (gameState.coinsCollected || 0) >= (gameState.goal.coinsNeeded || 0)
        ) {
          engineState.current.overrideNextTick = () => onLevelCompleted();
        }
      }

      function detectBlocks() {
        let changeDir;
        for (let { x, y, color } of gameState.blocks || []) {
          if (newX === x && newY === y) {
            let action = userProgram[color];
            if (action === "turn-left") {
              changeDir =
                DIRS[(DIRS.indexOf(dir) + DIRS.length + 1) % DIRS.length];
            } else if (action === "turn-right") {
              changeDir =
                DIRS[(DIRS.indexOf(dir) + DIRS.length - 1) % DIRS.length];
            } else if (action === "turn-around") {
              changeDir =
                DIRS[(DIRS.indexOf(dir) + DIRS.length + 2) % DIRS.length];
            }
          }
        }
        if (changeDir) {
          engineState.current.overrideNextTick = () =>
            (gameState.robot.dir = changeDir);
        }
      }

      function detectCoins() {
        for (let { x, y } of gameState.coins || []) {
          if (newX === x && newY === y) {
            engineState.current.overrideNextTick = () => { };
            engineState.current.onNextTick.push(() => {
              gameState.coinsCollected = (gameState.coinsCollected || 0) + 1;
              gameState.coins = gameState.coins.filter(
                c => c.x !== x || c.y !== y
              );
            });
          }
        }
      }

      function detectWalls() {
        if (newX < 0) {
          moveForward = false;
        } else if (newX >= gameState.gridSize) {
          moveForward = false;
        }

        if (newY < 0) {
          moveForward = false;
        } else if (newY >= gameState.gridSize) {
          moveForward = false;
        }

        for (let { x, y } of gameState.walls || []) {
          if (newX === x && newY === y) {
            moveForward = false;
          }
        }
      }
    }

    render();

    return () => {
      continueRendering = false;
    };
  }, [engineState.current, running, level]);

  let [mousedown, setMousedown] = useState(false);

  function hitTest(ev) {
    if (!level) {
      return null;
    }
    let b = canvasRef.current.getBoundingClientRect();
    let marginPx = (CANVAS_MARGIN * b.width) / CANVAS_SIZE;
    let xF = (ev.clientX - b.left - marginPx) / (b.width - marginPx * 2);
    let yF = (ev.clientY - b.top - marginPx) / (b.width - marginPx * 2);
    return {
      x: Math.max(
        0,
        Math.min(level.gridSize - 1, Math.floor(xF * level.gridSize))
      ),
      y: Math.max(
        0,
        Math.min(level.gridSize - 1, Math.floor(yF * level.gridSize))
      )
    };
  }

  return (
    <canvas
      className={styles.gameBoard}
      ref={canvasRef}
      onMouseDown={ev => {
        onCellClick(hitTest(ev));
        setMousedown(true);
      }}
      onMouseMove={ev => mousedown && onCellClick(hitTest(ev))}
      onMouseUp={() => setMousedown(false)}
    />
  );
}

function lerp(from, to, f) {
  return from + (to - from) * f;
}

function titleCase(s) {
  return s
    .split(/\s+/)
    .map(c => c.charAt(0).toLocaleUpperCase() + c.substring(1))
    .join(" ");
}

function FlippedReplyIcon(props) {
  return <ReplyIcon {...props} className={styles.flippedIcon} />;
}
