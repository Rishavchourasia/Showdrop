import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import styles from './SparkBurst.module.scss';

/*
 * Wrap a button to make it pop when clicked: a ring expands from the exact
 * point you clicked and a handful of lime sparks fly out. Purely decorative
 * feedback; the click itself still goes to the button as normal.
 *
 *   <SparkBurst><Button variant="go">Pay</Button></SparkBurst>
 */
interface Burst {
  id: number;
  x: number;
  y: number;
}

const SPARKS = 9;

export function SparkBurst({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const next = useRef(0);

  const onClick = (e: MouseEvent<HTMLSpanElement>) => {
    if (reduce) return;
    const box = e.currentTarget.getBoundingClientRect();
    const burst = { id: next.current++, x: e.clientX - box.left, y: e.clientY - box.top };
    setBursts((b) => [...b, burst]);
    window.setTimeout(() => setBursts((b) => b.filter((x) => x.id !== burst.id)), 700);
  };

  return (
    <span className={styles.wrap} onClickCapture={onClick}>
      {children}
      <AnimatePresence>
        {bursts.map((b) => (
          <span key={b.id} className={styles.origin} style={{ left: b.x, top: b.y }} aria-hidden="true">
            <motion.span
              className={styles.ring}
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
            />
            {Array.from({ length: SPARKS }, (_, i) => {
              const a = (i / SPARKS) * Math.PI * 2 + b.id; // vary the pattern per click
              return (
                <motion.span
                  key={i}
                  className={styles.spark}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, opacity: 0, scale: 0.3 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.3, 1] }}
                />
              );
            })}
          </span>
        ))}
      </AnimatePresence>
    </span>
  );
}
