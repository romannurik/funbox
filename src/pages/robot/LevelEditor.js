import React from "react";
import { Game } from "./Game";

export function LevelEditor({ level: initialLevel }) {
  let [level, setLevel] = React.useState(
    initialLevel || {
      gridSize: 9,
      robot: { x: 0, y: 0, dir: "r" },
      goal: { x: 1, y: 0 }
    }
  );
  let [activeTool, setActiveTool] = React.useState("goal");

  return (
    <>
      <div
        tabIndex={0}
        onPaste={ev => {
          let s = ev.clipboardData.getData("text/plain");
          try {
            let l = eval(`(${s})`);
            setLevel(l);
          } catch (e) {console.error(e)}
        }}
        onKeyDown={ev => {
          switch (ev.key) {
            case "g":
              setActiveTool("goal");
              break;
            case "w":
              setActiveTool("wall");
              break;
            case "c":
              setActiveTool("coin");
              break;
            case "r":
              setActiveTool("robot");
              break;
            case "e":
              setActiveTool("eraser");
              break;
            case "1":
              setActiveTool("color.purple");
              break;
            case "2":
              setActiveTool("color.red");
              break;
            case "3":
              setActiveTool("color.blue");
              break;
          }
        }}
      >
        <div>
          Grid size:{" "}
          <input
            type="number"
            value={level.gridSize}
            onChange={ev => {
              setLevel({
                ...level,
                gridSize: Math.max(5, Number(ev.target.value))
              });
            }}
          />
          <br />
          Active tool: {activeTool}
        </div>
        <Game
          level={level}
          onAdvanceToNextLevel={() => setLevel({ ...level })}
          onCellClick={({ x, y }) => {
            let newLevel = JSON.parse(JSON.stringify(level));
            newLevel.startText = newLevel.doneText = "";
            newLevel.blocks = (newLevel.blocks || []).filter(
              b => b.x !== x || b.y !== y
            );
            newLevel.coins = (newLevel.coins || []).filter(
              b => b.x !== x || b.y !== y
            );
            newLevel.walls = (newLevel.walls || []).filter(
              b => b.x !== x || b.y !== y
            );
            if (activeTool === "goal") {
              newLevel.goal = { x, y };
            } else if (activeTool === "wall") {
              newLevel.walls.push({ x, y });
            } else if (activeTool === "robot") {
              newLevel.robot = { x, y, dir: "r" };
            } else if (activeTool === "coin") {
              newLevel.coins.push({ x, y });
            } else if (activeTool.startsWith("color")) {
              let { color } = activeTool.match(/color\.(?<color>\w+)/).groups;
              newLevel.blocks.push({ x, y, color });
            }
            newLevel.goal.coinsNeeded = newLevel.coins.length;
            setLevel(newLevel);
          }}
        />
        <textarea
          style={{
            backgroundColor: "black",
            color: "white",
            overflowY: "scroll",
            height: 200
          }}
          readonly
          value={JSON.stringify(level)}
        />
      </div>
    </>
  );
}
