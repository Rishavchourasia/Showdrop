import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '../../../Utils/cx';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './TextLink.module.scss';

/** An in-app text link ("Log in", "← All events"). Use ButtonLink when it should look like a button. */
export function TextLink({
  tone = 'accent',
  icon,
  className,
  children,
  ...rest
}: LinkProps & { tone?: 'accent' | 'muted'; icon?: IconName; children: ReactNode }) {
  return (
    <Link className={cx(styles.link, styles[tone], className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </Link>
  );
}
