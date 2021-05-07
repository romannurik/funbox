import React from 'react';
import styles from './RobotGame.module.scss';
import { Game } from './Game';
import { ChevronLeftIcon, ChevronRightIcon } from '@primer/octicons-react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { LevelEditor } from './LevelEditor';
import { Message } from './Message';

const LEVEL_CHAPTERS = [
  import('./levels/01-intro'),
  import('./levels/02-coins'),
  import('./levels/03-walls'),
  import('./levels/04-turnaround')
];

export function RobotGame() {
  let [level, setLevel] = React.useState(0);
  let [loadedLevels, setLoadedLevels] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      let levels = (await Promise.all(
        (await Promise.all(LEVEL_CHAPTERS)).flatMap(m => m.default)
      )).map(m => m.default);
      setLoadedLevels(levels);
    })();
  }, []);

  function changeLevel(dir) {
    setLevel(Math.max(0, Math.min(loadedLevels.length, level + dir)));
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
                    disabled={level === loadedLevels.length}
                    className={styles.levelButton}
                    onClick={() => changeLevel(1)}
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
                {level < loadedLevels.length && (
                  <Game
                    level={loadedLevels[level]}
                    onAdvanceToNextLevel={() => changeLevel(1)}
                  />
                )}
                {level === loadedLevels.length && (
                  <div style={{ position: 'relative', margin: 40 }}>
                    <Message show>
                      Stay tuned! More levels are coming soon
                    </Message>
                  </div>
                )}
              </>
            )}
          </div>
        </Route>
      </Switch>
    </Router>
  );
}
