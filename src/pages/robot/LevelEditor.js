import cn from 'classnames';
import React from 'react';
import { Game } from './Game';
import styles from './LevelEditor.module.scss';
import { COLORMAP } from './const';

const MIN_GRID = 5;

let TOOLS = {
  eraser: {
    key: 'e',
    title: 'Erase',
    exec: (level, x, y) => {}
  },
  wall: {
    key: 'w',
    exec: (level, x, y) => level.walls.push({ x, y })
  },
  coin: {
    key: 'c',
    exec: (level, x, y) => level.coins.push({ x, y })
  },
  goal: {
    key: 'g',
    exec: (level, x, y) => (level.goal = { x, y })
  },
  robot: {
    key: 'r',
    exec: (level, x, y) => (level.robot = { x, y, dir: 'r' })
  },
  shrink: {
    key: 's',
    exec: (level, x, y) => {
      if (level.gridSize <= MIN_GRID) {
        return;
      }

      level.gridSize -= 1;
      let f = o => o.x !== x && o.y !== y;
      level.blocks = (level.blocks || []).filter(f);
      level.coins = (level.coins || []).filter(f);
      level.walls = (level.walls || []).filter(f);
      let move = o => {
        if (o.x >= x) o.x = Math.max(0, o.x - 1);
        if (o.y >= y) o.y = Math.max(0, o. - 1);
      };
      for (let o of [
        ...(level.blocks || []),
        ...(level.coins || []),
        ...(level.walls || [])
      ]) {
        move(o);
      }
      move(level.robot);
      move(level.goal);
    }
  }
};

for (let [i, color] of ['red', 'blue', 'purple'].entries()) {
  TOOLS[`color-${color}`] = {
    key: String(i + 1),
    ind: (
      <div
        className={styles.colorTool}
        style={{
          color: COLORMAP[color] || color
        }}
      />
    ),
    exec: (level, x, y) => level.blocks.push({ x, y, color })
  };
}

export function LevelEditor({ level: initialLevel }) {
  let [level, _setLevel] = React.useState(
    initialLevel || {
      gridSize: 9,
      robot: { x: 0, y: 0, dir: 'r' },
      goal: { x: 1, y: 0 }
    }
  );

  let [undoStack, _setUndoStack] = React.useState([]);

  let [activeTool, setActiveTool] = React.useState('goal');

  function setLevel(l) {
    _setUndoStack([...undoStack.slice(-20), level]);
    _setLevel(l);
  }

  function undo() {
    if (undoStack.length) {
      _setLevel(undoStack.pop());
      _setUndoStack([...undoStack]);
    }
  }

  React.useEffect(() => {
    let listener = ev => {
      let tool = (Object.entries(TOOLS).find(
        ([id, { key }]) => key === ev.key
      ) || [])[0];
      if (tool) {
        setActiveTool(tool);
      }
      if (ev.key === 'z') {
        undo();
      }
    };
    window.addEventListener('keydown', listener, false);
    return () => window.removeEventListener('keydown', listener, false);
  }, []);

  return (
    <div
      className={styles.levelEditor}
      tabIndex={0}
      onPaste={ev => {
        let s = ev.clipboardData.getData('text/plain');
        try {
          setLevel(eval(`(${s})`));
        } catch (e) {
          console.error(e);
        }
      }}
    >
      <div className={styles.levelEditorUI}>
        <div className={styles.toolGroup}>
          <label className={styles.inputTool}>
            <span>Grid size</span>
            <input
              type="number"
              value={level.gridSize}
              onChange={ev => {
                setLevel({
                  ...level,
                  gridSize: Math.max(MIN_GRID, Number(ev.target.value))
                });
              }}
            />
          </label>
        </div>
        <div className={styles.toolGroup}>
          {Object.entries(TOOLS).map(([id, tool]) => (
            <button
              key={id}
              className={cn(styles.tool, {
                [styles.isSelected]: activeTool === id
              })}
              onClick={() => setActiveTool(id)}
            >
              <span className={styles.title}>
                {tool.ind || tool.title || titleCase(id)}
              </span>
              {tool.key && (
                <span className={styles.hotKey}>
                  {tool.key.toLocaleUpperCase()}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className={styles.toolGroup}>
          <button onClick={() => undo()}>
            <span className={styles.title}>Undo</span>
            <span className={styles.hotKey}>Z</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(level));
            }}
          >
            Copy JSON
          </button>
        </div>
      </div>
      <Game
        className={styles.gameUI}
        level={level}
        onAdvanceToNextLevel={() => setLevel({ ...level })}
        onCellClick={({ x, y }) => {
          let levelString = JSON.stringify(level);
          let newLevel = JSON.parse(levelString);
          newLevel.startText = newLevel.doneText = '';
          let f = o => o.x !== x || o.y !== y;
          newLevel.blocks = (newLevel.blocks || []).filter(f);
          newLevel.coins = (newLevel.coins || []).filter(f);
          newLevel.walls = (newLevel.walls || []).filter(f);
          TOOLS[activeTool].exec(newLevel, x, y);
          newLevel.goal.coinsNeeded = newLevel.coins.length;
          if (JSON.stringify(newLevel) !== levelString) {
            setLevel(newLevel);
          }
        }}
      />
    </div>
  );
}

function titleCase(s) {
  return s
    .split(/\s+/)
    .map(c => c.charAt(0).toLocaleUpperCase() + c.substring(1))
    .join(' ');
}
