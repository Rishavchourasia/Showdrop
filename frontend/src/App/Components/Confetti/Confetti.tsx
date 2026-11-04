import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import { seededRandom } from '../../Utils/random';
import styles from './Confetti.module.scss';

const COLORS = ['var(--lime-500)', 'var(--uv-400)', 'var(--pink-400)', 'var(--cyan-400)', 'var(--amber-400)'];

/*
 * A one-shot celebratory burst (booking confirmed). Each piece flies out on its
 * own random path, spins and fades. Skipped entirely when the user prefers reduced motion.
 */
export function Confetti({ pieces = 70, seed = 7 }: { pieces?: number; seed?: number }) {
  const reduce = useReducedMotion();
  const parts = useMemo(() => {
    const random = seededRandom(seed);
    return Array.from({ length: pieces }, (_, i) => {
      const angle = (Math.PI * 2 * i) / pieces + random() * 0.5;
      const distance = 180 + random() * 260;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance * 0.7 - 120,
        rotate: random() * 720 - 360,
        color: COLORS[i % COLORS.length],
        w: 6 + random() * 6,
        h: 8 + random() * 10,
        delay: random() * 0.15,
      };
    });
  }, [pieces, seed]);
  if (reduce) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      {parts.map((p) => (
        <motion.span
          key={p.id}
          className={styles.piece}
          style={{ background: p.color, width: p.w, height: p.h }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 260], rotate: p.rotate, opacity: [1, 1, 0], scale: 1 }}
          transition={{ duration: 2.2, delay: p.delay, ease: [0.16, 1, 0.3, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
