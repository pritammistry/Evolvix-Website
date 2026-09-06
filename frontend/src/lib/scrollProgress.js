// How far through a sticky scroll section the reader is, 0 to 1.
//
// Pulled out of the component so it can be tested directly: it is the one piece
// of maths on that page that everything else depends on, and it is only
// exercisable in a real browser otherwise.
export function sectionProgress(rectTop, rectHeight, viewportHeight) {
  const travel = rectHeight - viewportHeight;
  if (!(travel > 0)) return 0;                // section shorter than the screen
  return Math.min(1, Math.max(0, -rectTop / travel));
}

// Which panel of `count` belongs to that progress. The last panel has to
// include p === 1, which a plain floor() would push one past the end.
export function activePanel(progress, count) {
  return Math.min(count - 1, Math.floor(progress * count));
}
