import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { cx } from '../../../Utils/cx';
import { EASE_OUT } from '../../../Utils/motion';
import { useIntroDone } from '../../Intro/IntroContext';
import styles from './FlipText.module.scss';

/*
 * A heading whose LETTERS flip down into place one after another, hinged at
 * the top like the tiles of a departure board, when it scrolls into view.
 *
 *   <FlipText as="h2" parts={[{ text: 'Four taps' }, { text: 'to the front row.', accent: true }]} />
 *
 * Screen readers get the plain sentence (aria-label); the letter spans are hidden from them.
 */
export interface FlipPart {
  text: string;
  accent?: boolean;
}

export function FlipText({
  parts,
  as: Tag = 'h2',
  className,
  delay = 0,
}: {
  parts: FlipPart[];
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const introDone = useIntroDone(); // hooks must run on every render, so read it first
  const show = inView && introDone;
  const label = parts.map((p) => p.text).join(' ');
  let n = 0; // running letter index for the stagger

  return (
    <Tag ref={ref} className={cx(styles.flip, className)} aria-label={label}>
      {parts.map((part, pi) => (
        <span key={pi} aria-hidden="true" className={cx(styles.part, part.accent && styles.accent)}>
          {part.text.split(' ').map((word, wi) => (
            // Each word is unbreakable, so a line never wraps mid-word.
            <span key={wi} className={styles.word}>
              {[...word].map((ch, ci) => {
                const i = n++;
                return (
                  <motion.span
                    key={ci}
                    className={styles.letter}
                    initial={{ rotateX: -95, opacity: 0 }}
                    animate={show ? { rotateX: 0, opacity: 1 } : undefined}
                    transition={{ duration: 0.7, ease: EASE_OUT, delay: delay + i * 0.028 }}
                  >
                    {ch}
                  </motion.span>
                );
              })}
            </span>
          ))}
        </span>
      ))}
    </Tag>
  );
}
