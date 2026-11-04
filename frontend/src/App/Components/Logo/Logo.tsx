import { motion } from 'motion/react';
import { APP_NAME } from '../../Constants/variableConstant';
import styles from './Logo.module.scss';

/*
 * The Showdrop mark: a ticket with a lime "drop" falling into it.
 * The drop bounces in once on load and again whenever you hover the logo.
 */
export function Logo({ size = 30, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <motion.span className={styles.logo} initial="hidden" animate="shown" whileHover="hover">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="showdrop-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6440f5" />
            <stop offset=".55" stopColor="#7c5cff" />
            <stop offset="1" stopColor="#ff6ad5" />
          </linearGradient>
        </defs>
        <path
          d="M5 8h22a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6v-3a2 2 0 0 1 2-2Z"
          fill="url(#showdrop-g)"
        />
        <path d="M21 10.5v2M21 15v2M21 19.5v2" stroke="#08070f" strokeWidth="1.8" strokeLinecap="round" />
        <motion.path
          d="M12 4.5c2.2 3 3.4 5 3.4 6.6a3.4 3.4 0 0 1-6.8 0c0-1.6 1.2-3.6 3.4-6.6Z"
          fill="#c6ff3d"
          stroke="#08070f"
          strokeWidth="1.2"
          variants={{
            hidden: { y: -14, opacity: 0 },
            shown: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 500, damping: 12, delay: 0.2 } },
            hover: { y: [0, -6, 0], opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
          }}
        />
      </svg>
      {wordmark && (
        <span className={styles.wordmark} aria-label={APP_NAME}>
          show<span>drop</span>
        </span>
      )}
    </motion.span>
  );
}
