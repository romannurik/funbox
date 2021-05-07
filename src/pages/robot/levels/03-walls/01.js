export default {
  gridSize: 7,
  robot: { x: 0, y: 1, dir: 'r' },
  goal: { x: 5, y: 1, coinsNeeded: 0 },
  walls: [{ x: 3, y: 2 }, { x: 3, y: 0 }, { x: 3, y: 1 }, { x: 3, y: 3 }],
  blocks: [
    { x: 5, y: 3, color: 'purple' },
    { x: 5, y: 5, color: 'blue' },
    { x: 1, y: 1, color: 'red' },
    { x: 1, y: 3, color: 'purple' },
    { x: 1, y: 5, color: 'blue' }
  ],
  doneText: '',
  startText: 'Walls keep the Robot from moving past them.'
};
