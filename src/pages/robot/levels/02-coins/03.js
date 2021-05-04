export default {
  gridSize: 7,
  robot: { x: 0, y: 3, dir: "r" },
  goal: { x: 3, y: 0, coinsNeeded: 3 },
  doneText: "",
  startText: "",
  blocks: [
    { x: 3, y: 3, color: "red" },
    { x: 3, y: 6, color: "purple" },
    { x: 6, y: 3, color: "blue" },
    { x: 6, y: 6, color: "purple" }
  ],
  coins: [{ x: 4, y: 3 }, { x: 3, y: 2 }, { x: 3, y: 4 }],
  walls: []
};
