export default {
  gridSize: 7,
  robot: { x: 0, y: 0, dir: 'r' },
  goal: { x: 0, y: 1, coinsNeeded: 0 },
  doneText: '',
  startText: '',
  blocks: [
    { x: 2, y: 0, color: 'purple' },
    { x: 4, y: 0, color: 'red' },
    { x: 6, y: 0, color: 'blue' },
    { x: 2, y: 2, color: 'red' },
    { x: 4, y: 2, color: 'blue' },
    { x: 6, y: 2, color: 'purple' },
    { x: 2, y: 4, color: 'blue' },
    { x: 6, y: 4, color: 'red' },
    { x: 4, y: 4, color: 'purple' },
    { x: 6, y: 6, color: 'blue' },
    { x: 0, y: 6, color: 'blue' },
    { x: 2, y: 6, color: 'purple' },
    { x: 4, y: 6, color: 'red' },
    { x: 0, y: 4, color: 'red' }
  ],
  startText: "Remember, you don't have to do something for every color.",
  doneText: 'That was tricky, great job!'
};
