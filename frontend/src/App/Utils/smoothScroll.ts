import Lenis from 'lenis';
import { prefersReducedMotion } from './motion';

/*
 * Smooth wheel scrolling via the Lenis library. It animates the real window
 * scroll, so `position: sticky` and Motion's useScroll() still work.
 * Skipped entirely for reduced-motion users; touch keeps native scrolling.
 */
let instance: Lenis | null = null;
const holds = new Set<string>(); // reasons the page is currently frozen

export function enableSmoothScroll(): () => void {
  if (prefersReducedMotion()) return () => {};
  instance = new Lenis({ autoRaf: true, lerp: 0.12 });
  if (holds.size) instance.stop();
  return () => {
    instance?.destroy();
    instance = null;
  };
}

/** Freeze or release the page for a named reason (e.g. 'intro', 'menu'). */
export function holdScroll(reason: string, on: boolean): void {
  if (on) holds.add(reason);
  else holds.delete(reason);
  const frozen = holds.size > 0;
  if (frozen) instance?.stop();
  else instance?.start();
  document.documentElement.style.overflow = frozen ? 'hidden' : '';
}

/** Put the page at the top immediately (used when changing pages). */
export function resetScroll(): void {
  if (instance) instance.scrollTo(0, { immediate: true, force: true });
  else window.scrollTo(0, 0);
}
