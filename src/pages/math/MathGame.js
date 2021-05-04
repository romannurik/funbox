import React from "react";
import { Board, Piece, Slot as Slot_, Tray as Tray_ } from "../../boardlib";
import { DotIllo } from "./DotIllo";
import styles from "./Math.module.scss";
import cn from "classnames";

const Tray = styled(Tray_, styles.tray);
const Slot = styled(Slot_, styles.slot);

function styled(Cmp, cls) {
  return ({ className, ...props }) => (
    <Cmp className={cn(className, cls)} {...props} />
  );
}

export function MathGame() {
  let [game, setGame] = React.useState(makeGame());
  let [result, setResult] = React.useState("");
  let [boardState, setBoardState] = React.useState({});

  function newGame() {
    setGame(makeGame());
  }

  function update(boardState) {
    setBoardState(boardState);
    let { n1, n2, n3 } = boardState;
    let { o1, o2 } = game;
    let a = [n1, o1, n2, o2, n3].map(v => v ?? 0);
    result = eval(a.join(" "));
    setResult(result);
  }

  let { n1, n2, n3 } = boardState;
  let { o1, o2, pieces } = game;
  n1 = Number(n1 || 0);
  n2 = Number(n2 || 0);
  n3 = Number(n3 || 0);

  return (
    <div className={styles.mathPageRoot}>
      <div className={styles.goal}>
        Can you make this number?
        <big>{game.goal}</big>
      </div>
      <Board key={JSON.stringify(game)} onChange={b => update(b)}>
        <Board.Pieces>
          {pieces.map(v => (
            <Piece
              key={v}
              className={cn(styles.piece, styles.number)}
              type="number"
              value={v}
            >
              {v}
            </Piece>
          ))}
        </Board.Pieces>
        <div className={styles.target}>
          <div className={styles.illoContainer}>
            <Slot className={styles.number} accept="number" id="n1" />
            <DotIllo c={5} n1={n1} />
          </div>
          <div className={styles.autoOp}>{o1}</div>
          <div className={styles.illoContainer}>
            <Slot className={styles.number} accept="number" id="n2" />
            <DotIllo c={5} n2={n2} />
          </div>
          <div className={styles.autoOp}>{o2}</div>
          <div className={styles.illoContainer}>
            <Slot className={styles.number} accept="number" id="n3" />
            <DotIllo c={5} n3={n3} />
          </div>
          <div className={styles.autoOp}>=</div>
          {!!result && (
            <div className={styles.illoContainer}>
              <div className={styles.autoNumber}>{result}</div>
              {o1 == "+" && o2 == "+" && (
                <DotIllo c={5} n1={n1} n2={n2} n3={n3} />
              )}
              {o1 == "+" && o2 == "-" && (
                <DotIllo
                  c={5}
                  n1={Math.max(0, Math.min(n1, n1 + n2 - n3))}
                  n2={Math.max(0, n2 - n3)}
                  s3={n3}
                />
              )}
            </div>
          )}
          {result == game.goal && !!n3 && !!n2 && (
            <div className={styles.gameWon}>
              You got it!
              <button style={{ marginTop: 24 }} onClick={newGame}>
                Play again
              </button>
            </div>
          )}
        </div>
        <div className={styles.trays}>
          <Tray className={styles.number} accept="number" />
          <Tray className={styles.op} accept="op" />
        </div>
      </Board>
    </div>
  );
}

function makeGame() {
  // pick some numbers
  let nums = [],
    ops,
    goal = 0;
  while (nums.length < 6) {
    nums = [
      ...new Set(
        Array(100)
          .fill()
          .map(_ => 1 + Math.floor(Math.random() * 9))
      )
    ].slice(0, 6);
  }
  while (goal <= 0 || nums.indexOf(goal) >= 0) {
    nums = nums.sort(_ => Math.random() - 0.5);
    ops = ["+", Math.random() < 0.5 ? "+" : "-"];
    goal = eval(`${nums[0]} ${ops[0]} ${nums[1]} ${ops[1]} ${nums[2]}`);
  }
  return {
    goal,
    o1: ops[0],
    o2: ops[1],
    pieces: nums
  };
}
