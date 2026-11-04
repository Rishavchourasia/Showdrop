import { motion } from 'motion/react';
import styles from './MusicVisuals.module.scss';

/** Animated equalizer bars, like a track playing. Pure CSS animation, staggered per bar. */
export function Equalizer({ bars = 5, height = 22 }: { bars?: number; height?: number }) {
  return (
    <span className={styles.eq} style={{ height }} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          style={{ animationDelay: `${(i * 137) % 600}ms`, animationDuration: `${700 + ((i * 211) % 500)}ms` }}
        />
      ))}
    </span>
  );
}

/** A spinning vinyl record with a glossy groove sheen. */
export function Vinyl({ size = 260 }: { size?: number }) {
  return (
    <motion.div
      className={styles.vinyl}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 6, ease: 'linear', repeat: Infinity }}
      aria-hidden="true"
    >
      <span className={styles.label} />
    </motion.div>
  );
}
