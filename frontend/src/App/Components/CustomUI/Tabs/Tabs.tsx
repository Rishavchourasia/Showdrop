import { LayoutGroup, motion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { cx } from '../../../Utils/cx';
import { SPRING_SNAPPY } from '../../../Utils/motion';
import styles from './Tabs.module.scss';

/*
 * Pill tabs with a highlight that SLIDES to the active tab.
 * The slide is a "shared layout animation": every tab can render the indicator
 * with the same layoutId, and motion animates it from the old tab to the new one.
 */
export interface TabOption<T extends string> {
  value: T;
  label: ReactNode;
  badge?: ReactNode;
}

interface TabsProps<T extends string> {
  options: ReadonlyArray<TabOption<T>>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs<T extends string>({ options, value, onChange, label, size = 'md', className }: TabsProps<T>) {
  const group = useId();
  return (
    <LayoutGroup id={group}>
      <div className={cx(styles.tabs, styles[size], className)} role="tablist" aria-label={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={cx(styles.tab, active && styles.active)}
              onClick={() => onChange(o.value)}
            >
              {active && <motion.span layoutId="indicator" className={styles.indicator} transition={SPRING_SNAPPY} />}
              <span className={styles.label}>
                {o.label}
                {o.badge}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
