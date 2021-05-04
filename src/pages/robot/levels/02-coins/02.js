export default {
  gridSize: 7,
  robot: { x: 2, y: 0, dir: "r" },
  goal: { x: 4, y: 0, coinsNeeded: 3 },
  coins: [{ x: 0, y: 3 }, { x: 3, y: 6 }, { x: 6, y: 3 }],
  blocks: [
    { x: 0, y: 0, color: "red" },
    { x: 0, y: 6, color: "red" },
    { x: 6, y: 0, color: "red" },
    { x: 6, y: 6, color: "red" }
  ],
  startText:
    "The goal doesn't activate until the Robot collects all the coins!",
  doneText: "Awesome! Let's see what's in the next level."
};
