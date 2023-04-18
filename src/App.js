import React from "react";
import { Redirect, Route, BrowserRouter as Router, Switch } from "react-router-dom";
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
        <Route path="/kidlang">
          Moved to <a href="https://kidlang.web.app">separate app</a>
        </Route>
        <Route path="/">
          <Redirect to="/robot" />
        </Route>
      </Switch>
    </Router>
  );
}
