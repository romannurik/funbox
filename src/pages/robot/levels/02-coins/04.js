export default {
  gridSize: 7,
  robot: { x: 0, y: 3, dir: 'r' },
  goal: { x: 3, y: 3, coinsNeeded: 3 },
  doneText: '',
  startText: '',
  blocks: [
    { x: 2, y: 2, color: 'red' },
    { x: 4, y: 4, color: 'red' },
    { x: 4, y: 2, color: 'blue' },
    { x: 2, y: 4, color: 'blue' },
    { x: 4, y: 3, color: 'purple' }
  ],
  coins: [{ x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 4 }],
  walls: []
};
