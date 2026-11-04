import type { ReactNode } from 'react';
import { Button } from '../Button/Button';
import { Icon, type IconName } from '../Icon/Icon';
import { Modal } from '../Modal/Modal';
import { Text } from '../Text/Text';
import styles from './ConfirmDialog.module.scss';

/*
 * "Are you sure?" built on the reusable Modal. Use it before anything the user
 * can't easily undo:
 *
 *   <ConfirmDialog open={asking} title="Release your seats?" confirmLabel="Release"
 *                  tone="danger" onConfirm={release} onCancel={() => setAsking(false)}>
 *     Someone else may book them.
 *   </ConfirmDialog>
 */
interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  icon?: IconName;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  icon = 'alert',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      icon={
        <span className={tone === 'danger' ? styles.iconDanger : styles.icon}>
          <Icon name={icon} size={20} />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof children === 'string' ? <Text>{children}</Text> : children}
    </Modal>
  );
}
