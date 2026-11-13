import { useInView } from 'motion/react';
import { useRef } from 'react';
import { cx } from '../../../Utils/cx';
import { useIntroDone } from '../../Intro/IntroContext';
import styles from './FlapNumber.module.scss';

/*
 * A SPLIT-FLAP number, like an old airport departures board. Each digit is a
 * little window over a strip of 0-9; when it scrolls into view the strip rolls
 * to the right digit, each window a beat after the one before.
 * Anything that isn't a digit ("+", "m") is printed as-is.
 */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function FlapNumber({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const introDone = useIntroDone(); // hooks must run on every render, so read it first
  const show = inView && introDone;

  return (
    <span ref={ref} className={cx(styles.board, className)} aria-label={value}>
      {[...value].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} className={styles.window} aria-hidden="true">
            <span
              className={styles.strip}
              // A plain CSS transition does the roll. The strip holds 0-9 twice (20 digits),
              // so each digit is 5% of its height; roll past 9 and round again to the target.
              style={{
                transform: `translateY(${show ? -5 * (10 + Number(ch)) : 0}%)`,
                transitionDuration: `${1.1 + i * 0.25}s`,
              }}
            >
              {[...DIGITS, ...DIGITS].map((d, k) => (
                <span key={k}>{d}</span>
              ))}
            </span>
          </span>
        ) : (
          <span key={i} className={styles.symbol} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
