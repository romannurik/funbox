export default {
  gridSize: 7,
  robot: { x: 0, y: 1, dir: "r" },
  goal: { x: 6, y: 5, coinsNeeded: 3 },
  coins: [{ x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }],
  blocks: [{ x: 3, y: 1, color: "blue" }, { x: 3, y: 5, color: "red" }],
  startText:
    "In this level, you'll need to collect all the coins before you reach the goal.",
  doneText: "You got the hang of it! Move on to the next level."
};
