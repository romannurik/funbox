import React from "react";
import { Board, Piece, Slot as Slot_, Tray as Tray_ } from "../../boardlib";
import { DotIllo } from "./DotIllo";
import styles from "./Math.module.scss";
import cn from "classnames";

const Tray = styled(Tray_, styles.tray);
const Slot = styled(Slot_, styles.slot);

function styled(Cmp, cls) {
  return ({ className, ...props }) => (
    <Cmp className={cn(cls, className)} {...props} />
  );
}

export function MathPlay() {
  let [result, setResult] = React.useState("");
  let [boardState, setBoardState] = React.useState({});

  function update(boardState) {
    setBoardState(boardState);
    let { n1, o1, n2, o2, n3 } = boardState;
    let a = [n1, o1, n2, o2, n3].filter(x => x !== null && x !== undefined);
    if (a.length == 0) {
      setResult(null);
      return;
    }
    if (a.length % 2 == 0) {
      a = a.slice(0, a.length - 1);
    }
    try {
      result = eval(a.join(" "));
      setResult(result);
    } catch (e) {}
  }

  let { n1, o1, n2, o2, n3 } = boardState;
  n1 = Number(n1 || 0);
  n2 = Number(n2 || 0);
  n3 = Number(n3 || 0);

  return (
    <div className={styles.mathPageRoot}>
      <Board onChange={b => update(b)}>
        <Board.Pieces>
          {Array(10)
            .fill()
            .map((v, i) => (
              <Piece
                key={i}
                className={cn(styles.piece, styles.number)}
                type="number"
                value={i + 1}
              >
                {i + 1}
              </Piece>
            ))}
          <Piece className={cn(styles.piece, styles.op)} type="op" value="+">
            +
          </Piece>
          <Piece className={cn(styles.piece, styles.op)} type="op" value="-">
            &ndash;
          </Piece>
          <Piece className={cn(styles.piece, styles.op)} type="op" value="*">
            &times;
          </Piece>
        </Board.Pieces>
        <div className={styles.trays}>
          <Tray infinite className={styles.number} accept="number" />
          <Tray infinite className={styles.op} accept="op" />
        </div>
        <div className={styles.target}>
          <div className={styles.illoContainer}>
            <Slot className={styles.number} accept="number" id="n1" />
            <DotIllo n1={n1} />
          </div>
          {!!n1 && <Slot className={styles.op} id="o1" accept="op" />}
          {!!o1 && (
            <div className={styles.illoContainer}>
              <Slot className={styles.number} accept="number" id="n2" />
              {o1 == "+" && <DotIllo n2={n2} />}
              {o1 == "*" && <DotIllo n2={n2} c={n2} />}
              {o1 == "-" && <DotIllo n2={n2} />}
            </div>
          )}
          {!!n2 && <Slot className={styles.op} id="o2" accept="op" />}
          {!!o2 && (
            <div className={styles.illoContainer}>
              <Slot className={styles.number} accept="number" id="n3" />
              {o2 == "+" && <DotIllo n3={n3} c={o1 == "*" ? n2 : 1} />}
              {o2 == "*" && <DotIllo n3={n3} c={n3} />}
              {o2 == "-" && <DotIllo n3={n3} c={o1 == "*" ? n2 : 1} />}
            </div>
          )}
          <div className={styles.autoOp}>=</div>
          {result !== null && (
            <div className={styles.illoContainer}>
              <div className={styles.autoNumber}>{result}</div>
              {o1 == "+" && !o2 && <DotIllo n1={n1} n2={n2} />}
              {o1 == "+" && o2 == "+" && <DotIllo n1={n1} n2={n2} n3={n3} />}
              {o1 == "+" && o2 == "*" && (
                <DotIllo n1={n1} n2={n2 * n3} c={n3} />
              )}
              {o1 == "+" && o2 == "-" && (
                <DotIllo
                  n1={Math.max(0, Math.min(n1, n1 + n2 - n3))}
                  n2={Math.max(0, n2 - n3)}
                  s3={n3}
                />
              )}
              {o1 == "*" && !o2 && <DotIllo n1={n1 * n2} c={n2} />}
              {o1 == "*" && o2 == "+" && (
                <DotIllo n1={n1 * n2} c={n2} n3={n3} />
              )}
              {o1 == "*" && o2 == "-" && (
                <DotIllo n1={Math.max(0, n1 * n2 - n3)} c={n2} s3={n3} />
              )}
              {o1 == "-" && !o2 && (
                <DotIllo n1={Math.max(0, n1 - n2)} s2={n2} />
              )}
            </div>
          )}
        </div>
      </Board>
    </div>
  );
}
