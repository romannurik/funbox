export default {
  gridSize: 8,
  robot: { x: 2, y: 2, dir: "r" },
  goal: { x: 2, y: 5, coinsNeeded: 0 },
  blocks: [
    { x: 5, y: 5, color: "red" },
    { x: 5, y: 2, color: "purple" },
    { x: 5, y: 3, color: "blue" }
  ],
  startText:
    "Look, new colors! Try giving the Robot instructions for a few different colors.",
  doneText: "Great job!"
};
