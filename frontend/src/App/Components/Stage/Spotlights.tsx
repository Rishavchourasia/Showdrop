import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../Utils/motion';
import styles from './Spotlights.module.scss';

/*
 * Two stage spotlights hanging from the top corners. Each beam swings to point
 * at your cursor (a spring gives it the weight of a real lamp); with no cursor
 * around they sway gently on their own, like a lighting rig warming up.
 *
 * HOW: each beam is a tall gradient rotated around its top end. The angle from
 * the lamp to the cursor is atan2(dx, dy); a spring smooths changes to it.
 */
const LAMPS = [
  { x: 0.12, hue: 'var(--uv-400)', idle: -18 },
  { x: 0.88, hue: 'var(--pink-400)', idle: 22 },
];

export function Spotlights() {
  const ref = useRef<HTMLDivElement>(null);
  const a0 = useMotionValue(LAMPS[0].idle);
  const a1 = useMotionValue(LAMPS[1].idle);
  const r0 = useSpring(a0, { stiffness: 40, damping: 12 });
  const r1 = useSpring(a1, { stiffness: 40, damping: 12 });

  useEffect(() => {
    const box = () => ref.current?.getBoundingClientRect();
    const aim = (mx: number, my: number) => {
      const b = box();
      if (!b) return;
      [a0, a1].forEach((mv, i) => {
        const dx = mx - (b.left + b.width * LAMPS[i].x);
        const dy = Math.max(40, my - b.top);
        mv.set((-Math.atan2(dx, dy) * 180) / Math.PI);
      });
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') aim(e.clientX, e.clientY);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // Idle sway (skipped with reduced motion), only when the mouse has been still a while.
    let lastMove = 0;
    const mark = () => (lastMove = Date.now());
    window.addEventListener('pointermove', mark, { passive: true });
    let t = 0;
    const sway = prefersReducedMotion()
      ? 0
      : window.setInterval(() => {
          t += 1;
          if (Date.now() - lastMove > 2500) {
            a0.set(LAMPS[0].idle + Math.sin(t / 3) * 14);
            a1.set(LAMPS[1].idle + Math.cos(t / 3.4) * 14);
          }
        }, 700);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointermove', mark);
      window.clearInterval(sway);
    };
  }, [a0, a1]);

  return (
    <div ref={ref} className={styles.rig} aria-hidden="true">
      {[r0, r1].map((rotate, i) => (
        <motion.div
          key={i}
          className={styles.beam}
          style={{ left: `${LAMPS[i].x * 100}%`, rotate, ['--beam' as string]: LAMPS[i].hue }}
        />
      ))}
    </div>
  );
}
