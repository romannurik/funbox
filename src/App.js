import React from "react";
import { BrowserRouter as Router, Redirect, Route, Switch } from "react-router-dom";
import { KidLangEditor } from "./pages/kidlang/KidLangEditor";
import { MathGame } from "./pages/math/MathGame";
import { MathPlay } from "./pages/math/MathPlay";
import { RobotGame } from "./pages/robot/RobotGame";

export function App() {
  return (
    <Router>
      <Switch>
        <Route path="/mathplay" component={MathPlay} />
        <Route path="/mathgame" component={MathGame} />
        <Route path="/robot" component={RobotGame} />
        <Route path="/kidlang" component={KidLangEditor} />
        <Route path="/">
          <Redirect to="/robot" />
          {/* <div>
            Available in the funbox:
            <p>
              <Link to="/mathplay">Math blocks</Link>
            </p>
            <p>
              <Link to="/mathgame">Math game</Link>
            </p>
            <p>
              <Link to="/robot">Robot programming game</Link>
            </p>
          </div> */}
        </Route>
      </Switch>
    </Router>
  );
}
