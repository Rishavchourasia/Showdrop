import type { ReactNode } from 'react';
import { cx } from '../../../Utils/cx';
import styles from './Marquee.module.scss';

/*
 * An endless horizontal ticker. The content is rendered twice and slides by 50%,
 * so the loop is seamless. Pauses on hover; stops entirely with "reduce motion".
 */
export function Marquee({
  children,
  speed = 40,
  reverse,
  className,
}: {
  children: ReactNode;
  speed?: number;
  reverse?: boolean;
  className?: string;
}) {
  return (
    <div className={cx(styles.marquee, className)}>
      <div className={cx(styles.track, reverse && styles.reverse)} style={{ animationDuration: `${speed}s` }}>
        <div className={styles.group}>{children}</div>
        <div className={styles.group} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
