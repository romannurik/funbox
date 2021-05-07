export default {
  gridSize: 7,
  robot: { x: 0, y: 1, dir: 'r' },
  goal: { x: 6, y: 5, coinsNeeded: 3 },
  coins: [{ x: 3, y: 2 }, { x: 3, y: 3 }, { x: 3, y: 4 }],
  blocks: [{ x: 3, y: 1, color: 'blue' }, { x: 3, y: 5, color: 'red' }],
  startText: 'You found some coins! Collect them all before you finish.',
  doneText: 'You got it!'
};
