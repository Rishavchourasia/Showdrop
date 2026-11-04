import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconButton } from '../IconButton/IconButton';
import { Text } from '../Text/Text';
import styles from './Modal.module.scss';

interface ModalProps {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;

  footer?: ReactNode;

  icon?: ReactNode;
}

export function Modal({ open, title, onClose, children, footer, icon }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    panelRef.current?.querySelector<HTMLElement>('button, [href], input')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <IconButton icon="close" label="Close" className={styles.close} onClick={onClose} />
        <div className={styles.head}>
          {icon}
          <Text id={titleId} variant="h2" as="h2">
            {title}
          </Text>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
