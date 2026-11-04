import { TOAST_DISMISSED } from '../../Redux/Actions/ToastConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { useDispatch, useSelector } from 'react-redux';
import { Icon, IconButton } from '../CustomUI';
import { cx } from '../../Utils/cx';
import styles from './Toaster.module.scss';

const ICON = { success: 'check', info: 'info', danger: 'alert' } as const;

export function Toaster() {
  const toasts = useSelector((state: RootState) => state.toasts);
  const dispatch = useDispatch();
  return (
    <div className={styles.region} aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={cx(styles.toast, styles[t.tone])} role="status">
          <Icon name={ICON[t.tone]} size={16} className={styles.icon} />
          <span>{t.message}</span>
          <IconButton
            icon="close"
            label="Dismiss"
            size="sm"
            className={styles.close}
            onClick={() => dispatch({ type: TOAST_DISMISSED, payload: t.id })}
          />
        </div>
      ))}
    </div>
  );
}
