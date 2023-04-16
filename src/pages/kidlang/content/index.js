import chp1 from '!!raw-loader!./chapter1.md';
import chp2 from '!!raw-loader!./chapter2.md';

export default [
  chapterFromMarkdown(chp1),
  chapterFromMarkdown(chp2),
];

function chapterFromMarkdown(md) {
  const pages = md.split(/\s*---+\s*/ms);
  return {
    title: 'Hello world',
    pages
  };
}