export type PosterCategory = 'movie' | 'concert' | 'comedy' | 'theatre' | 'music';

/** Map a backend category ("Movie", "Comedy"...) to a poster art style. */
export function toPosterCategory(category: string): PosterCategory {
  const c = category.toLowerCase();
  if (c.startsWith('movie') || c === 'film') return 'movie';
  if (c.startsWith('concert')) return 'concert';
  if (c.startsWith('comedy')) return 'comedy';
  if (c.startsWith('theat')) return 'theatre';
  return 'music';
}
