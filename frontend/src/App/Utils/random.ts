/**
 * A tiny seeded pseudo-random generator. Same seed -> same sequence.
 * WHY not Math.random()? React may render a component more than once; random
 * values during render would make it look different each time. Seeded values
 * are stable, so generated posters and confetti stay consistent.
 */
export function seededRandom(seed: number): () => number {
  let t = seed * 9301 + 49297;
  return () => {
    t = (t * 9301 + 49297) % 233280;
    return t / 233280;
  };
}
