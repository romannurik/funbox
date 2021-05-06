import React from "react";
import styles from "./RobotGame.module.scss";
import { Game } from "./Game";
import { ChevronLeftIcon, ChevronRightIcon } from "@primer/octicons-react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { LevelEditor } from "./LevelEditor";

const LEVELS = [
  import("./levels/01-intro/01"),
  import("./levels/01-intro/02"),
  import("./levels/01-intro/03"),
  import("./levels/01-intro/04"),
  import("./levels/01-intro/05"),
  import("./levels/01-intro/06"),
  import("./levels/02-coins/01"),
  import("./levels/02-coins/02"),
  import("./levels/02-coins/03"),
  import("./levels/03-walls/01"),
  import("./levels/03-walls/02"),
  import("./levels/04-turnaround/01"),
  import("./levels/04-turnaround/02"),
];

export function RobotGame() {
  let [level, setLevel] = React.useState(0);
  let [loadedLevels, setLoadedLevels] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      setLoadedLevels((await Promise.all(LEVELS)).map(m => m.default));
    })();
  }, []);

  function changeLevel(dir) {
    setLevel(Math.max(0, Math.min(loadedLevels.length - 1, level + dir)));
  }

  return (
    <Router>
      <Switch>
        <Route path="/robot/edit" component={LevelEditor} />
        <Route>
          <div className={styles.main}>
            {loadedLevels && (
              <>
                <div className={styles.levelPicker}>
                  <button
                    disabled={level === 0}
                    className={styles.levelButton}
                    onClick={() => changeLevel(-1)}
                  >
                    <ChevronLeftIcon />
                  </button>
                  Level {level + 1}
                  <button
                    disabled={level === loadedLevels.length - 1}
                    className={styles.levelButton}
                    onClick={() => changeLevel(1)}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
                <Game
                  level={loadedLevels[level]}
                  onAdvanceToNextLevel={() => changeLevel(1)}
                />
              </>
            )}
          </div>
        </Route>
      </Switch>
    </Router>
  );
}
