import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Icon, Text } from '../CustomUI';
import styles from './TicketQR.module.scss';

/*
 * The entry code on a confirmed ticket. Like at a real venue door, you press
 * and HOLD to reveal it, which also stops someone screenshotting it over your shoulder.
 *
 * The pattern is generated from the booking id (demo only: it isn't a scannable QR).
 */
function cells(seed: number): boolean[] {
  let t = seed * 7919 + 104729;
  return Array.from({ length: 21 * 21 }, (_, i) => {
    const x = i % 21;
    const y = Math.floor(i / 21);
    const finder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) {
      const lx = (x % 14) % 7;
      const ly = (y % 14) % 7;
      return lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
    }
    t = (t * 48271) % 2147483647;
    return t % 3 === 0;
  });
}

const HOLD_MS = 600;

export function TicketQR({ bookingId }: { bookingId: number }) {
  const [revealed, setRevealed] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const grid = cells(bookingId);

  const start = () => {
    setHolding(true);
    timer.current = window.setTimeout(() => setRevealed(true), HOLD_MS);
  };
  const stop = () => {
    setHolding(false);
    window.clearTimeout(timer.current);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.code}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setRevealed(true)}
        aria-label={revealed ? `Entry code for booking ${bookingId}` : 'Press and hold to reveal your entry code'}
      >
        <svg viewBox="0 0 21 21" className={revealed ? styles.sharp : styles.blurred} aria-hidden="true">
          {grid.map((on, i) => (on ? <rect key={i} x={i % 21} y={Math.floor(i / 21)} width="1" height="1" /> : null))}
        </svg>
        <AnimatePresence>
          {!revealed && (
            <motion.span
              className={styles.cover}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.span
                className={styles.holdRing}
                animate={{ scale: holding ? 1.35 : 1, opacity: holding ? 1 : 0.7 }}
                transition={{ duration: HOLD_MS / 1000 }}
              >
                <Icon name="qr" size={22} />
              </motion.span>
              <Text variant="caption">{holding ? 'Keep holding…' : 'Press & hold'}</Text>
            </motion.span>
          )}
        </AnimatePresence>
      </button>
      <Text variant="mono" tone="muted">
        BYS-{String(bookingId).padStart(6, '0')}
      </Text>
    </div>
  );
}
