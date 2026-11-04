import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import styles from './ProgressRing.module.scss';

/** A circular progress indicator (used as the checkout countdown). progress: 0…1 */
export function ProgressRing({
  progress,
  size = 120,
  stroke = 8,
  tone = 'highlight',
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  tone?: 'highlight' | 'danger';
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <motion.circle
          className={styles[tone]}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ type: 'spring', stiffness: 60, damping: 20 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={styles.center}>{children}</div>
    </div>
  );
}
