import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { EASE_OUT, EASE_STAGE, SPRING_SOFT } from '../../Utils/motion';
import { Logo } from '../Logo/Logo';
import styles from './TicketIntro.module.scss';

/*
 * THE OPENING: a ticket is handed to you, punched, and torn.
 *
 *   arrive (0 - 0.7s)  the ticket springs up into the centre of a dark screen
 *   punch  (0.7s)      a hole is punched in the stub (a ring pops out of it)
 *   tear   (1.0s)      it rips along the perforation: the main half spins off
 *                      up-left, the stub drops down-right, the backdrop dissolves
 *
 * ~1.6s total, once per session, and ANY click / key / scroll / touch skips it.
 */
type Phase = 'arrive' | 'punch' | 'tear';
const SKIP = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

export function TicketIntro({ done, onDone }: { done: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('arrive');

  useEffect(() => {
    if (done) return;
    let over = false;
    const finish = () => {
      if (!over) {
        over = true;
        onDone();
      }
    };
    const timers = [
      window.setTimeout(() => setPhase('punch'), 700),
      window.setTimeout(() => setPhase('tear'), 1000),
      window.setTimeout(finish, 1650),
    ];
    for (const ev of SKIP) window.addEventListener(ev, finish, { once: true, passive: true });
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      for (const ev of SKIP) window.removeEventListener(ev, finish);
    };
    // Runs once: `done` only ever goes from false to true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const torn = phase === 'tear';

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="ticket-intro"
          aria-hidden="true"
          className={styles.backdrop}
          initial={{ opacity: 1 }}
          animate={{ opacity: torn ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: EASE_OUT, delay: torn ? 0.2 : 0 }}
        >
          <motion.div
            className={styles.ticket}
            initial={{ y: '60vh', rotate: 12, scale: 0.8 }}
            animate={{ y: 0, rotate: -3, scale: 1 }}
            transition={SPRING_SOFT}
          >
            {/* main half: flies up-left when torn */}
            <motion.div
              className={styles.main}
              animate={torn ? { x: '-75vw', y: '-40vh', rotate: -38 } : { x: 0, y: 0, rotate: 0 }}
              transition={{ duration: 0.75, ease: EASE_STAGE }}
            >
              <span className={styles.kicker}>Admit one · Row F · Seat 7</span>
              <Logo size={46} />
              <span className={styles.tagline}>Catch the drop.</span>
            </motion.div>

            {/* stub: gets punched, then drops down-right */}
            <motion.div
              className={styles.stub}
              animate={torn ? { x: '40vw', y: '70vh', rotate: 52 } : { x: 0, y: 0, rotate: 0 }}
              transition={{ duration: 0.75, ease: EASE_STAGE }}
            >
              <span className={styles.stubText}>No. 000001</span>
              <span className={styles.holeWrap}>
                <motion.span
                  className={styles.hole}
                  initial={{ scale: 0 }}
                  animate={{ scale: phase === 'arrive' ? 0 : 1 }}
                  transition={{ type: 'spring', stiffness: 700, damping: 18 }}
                />
                {phase !== 'arrive' && (
                  <motion.span
                    className={styles.punchRing}
                    initial={{ scale: 0.4, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  />
                )}
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
