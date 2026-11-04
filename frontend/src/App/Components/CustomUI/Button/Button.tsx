import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cx } from '../../../Utils/cx';
import { Spinner } from '../Spinner/Spinner';
import styles from './Button.module.scss';

/*
 * The ONE button of the app. Pick a look with `variant`, never with custom CSS:
 *   primary   the main action of a screen (ultraviolet gradient + glow)
 *   go        the money moment: "Pay ₹400" (acid lime)
 *   secondary a normal action (frosted glass)
 *   outline   a light choice, e.g. a show time or a suggestion
 *   ghost     low emphasis ("Cancel")
 *   danger    destructive ("Release seats")
 *   brand     the animated gradient call-to-action (the "Ask AI" button)
 */
type Variant = 'primary' | 'go' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand';
type Size = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  shape?: 'rounded' | 'pill';
  /** Put the label at the start instead of the centre (for list-like buttons). */
  alignStart?: boolean;
}

interface ButtonProps extends StyleProps, ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
}

function classes(
  { variant = 'secondary', size = 'md', fullWidth, shape = 'rounded', alignStart }: StyleProps,
  extra?: string,
) {
  return cx(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    shape === 'pill' && styles.pill,
    alignStart && styles.alignStart,
    extra,
  );
}

export function Button({
  variant,
  size,
  fullWidth,
  shape,
  alignStart,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes({ variant, size, fullWidth, shape, alignStart }, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner size={14} className={styles.spinner} />}
      <span className={cx(styles.label, loading && styles.labelLoading)}>{children}</span>
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  shape,
  alignStart,
  className,
  children,
  ...rest
}: StyleProps & LinkProps) {
  return (
    <Link className={classes({ variant, size, fullWidth, shape, alignStart }, className)} {...rest}>
      <span className={styles.label}>{children}</span>
    </Link>
  );
}
