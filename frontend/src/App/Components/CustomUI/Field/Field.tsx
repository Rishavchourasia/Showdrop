import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../../Utils/cx';
import styles from './Field.module.scss';

interface FieldShellProps {
  label: string;

  /** Keep the label for screen readers but don't show it (e.g. a chat box). */
  hideLabel?: boolean;

  error?: string | null;

  hint?: ReactNode;
  className?: string;
}

function FieldShell({
  label,
  hideLabel,
  error,
  hint,
  className,
  id,
  children,
}: FieldShellProps & { id: string; children: ReactNode }) {
  return (
    <div className={cx(styles.field, className)}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : styles.label}>
        {label}
      </label>
      {children}
      {error ? (
        <span id={`${id}-msg`} className={styles.error} role="alert">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-msg`} className={styles.hint}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

type TextFieldProps = FieldShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    prefix?: string;
  };

export function TextField({ label, hideLabel, error, hint, className, prefix, ...input }: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hideLabel={hideLabel} error={error} hint={hint} className={className}>
      <div className={cx(styles.control, error && styles.invalid)}>
        {prefix && <span className={styles.prefix}>{prefix}</span>}
        <input id={id} className={styles.input} aria-invalid={!!error} aria-describedby={`${id}-msg`} {...input} />
      </div>
    </FieldShell>
  );
}
