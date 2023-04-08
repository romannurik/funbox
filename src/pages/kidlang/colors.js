import colornames from 'colornames';
import tinycolor from 'tinycolor2';

const validColors = colornames.all().filter(c => !!c.css);

export const NAMED_COLORS = validColors.map(c => c.name);

const COLOR_RGB = {};
for (let k of validColors) {
  COLOR_RGB[k.name] = tinycolor(k.value).toRgb();
}

export function findNearestNamedColor({ r, g, b }) {
  let nearest = 'black';
  let distance = Infinity;
  for (let [name, rgb] of Object.entries(COLOR_RGB)) {
    let thisDist = Math.sqrt((rgb.r - r) ** 2 + (rgb.g - g) ** 2 + (rgb.b - b) ** 2);
    if (thisDist < distance) {
      distance = thisDist;
      nearest = name;
    }
  }
  return nearest;
}