/*
 * Showdrop's motion vocabulary. Reusing a handful of named values keeps every
 * animation feeling like part of one product.
 */

/** Entrances: quick to start, soft landing. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Big theatrical moves (the intro, the curtains): slow-fast-slow. */
export const EASE_STAGE = [0.65, 0, 0.35, 1] as const;

/** Snappy UI feedback: sliding highlights, chips, toggles. */
export const SPRING_SNAPPY = { type: 'spring', stiffness: 520, damping: 38 } as const;

/** Softer spring for larger objects (cards, tickets). */
export const SPRING_SOFT = { type: 'spring', stiffness: 170, damping: 22 } as const;

/** True when the user asked their OS for less motion. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
