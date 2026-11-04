import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../../Utils/cx';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './IconButton.module.scss';

/*
 * A round button that shows only an icon (close, log out, refresh...).
 * `label` is REQUIRED: screen readers can't read an icon, so it becomes the aria-label.
 */
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  label: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'onAccent';
}

export function IconButton({
  icon,
  label,
  size = 'md',
  tone = 'default',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.iconButton, styles[size], styles[tone], className)}
      aria-label={label}
      title={rest.title ?? label}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 14 : 18} />
    </button>
  );
}
