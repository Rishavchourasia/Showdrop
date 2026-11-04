import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTE_LOGIN } from '../../Constants/RouteConstants';
import type { AppError } from '../../Models/HttpModels';
import type { AppAction } from '../../Redux/Actions/AppAction';
import { LOGOUT } from '../../Redux/Actions/AuthConstants';
import { exceptionDismissed } from '../../Redux/Actions/ErrorActions';
import type { RootState } from '../../Redux/Reducers/reducers';
import { friendlyMessage, presentError } from '../../Utils/errors';
import { Button, Icon, Modal, Text } from '../CustomUI';
import styles from './ExceptionModal.module.scss';

/*
 * Two layers:
 *   ExceptionModal        reusable and presentational: give it an error + callbacks, it renders.
 *                         Use it directly anywhere you hold an error yourself.
 *   GlobalExceptionModal  mounted ONCE in App.tsx, connected to Redux. Any saga or component
 *                         can show it with exceptionRaised(error) / useException().
 */
interface ExceptionModalProps {
  error: (AppError & { occurredAt?: string }) | null;
  onDismiss: () => void;
  /** "Try again". If omitted, the button reloads the page. */
  onRetry?: () => void;
  /** "Log in again" for an expired session. */
  onLogin?: () => void;
}

export function ExceptionModal({ error, onDismiss, onRetry, onLogin }: ExceptionModalProps) {
  if (!error) return null;
  const p = presentError(error);

  const primary = {
    retry: (
      <Button
        variant="primary"
        onClick={() => {
          onDismiss();
          if (onRetry) onRetry();
          else window.location.reload();
        }}
      >
        <Icon name="refresh" size={16} />
        {onRetry ? 'Try again' : 'Reload page'}
      </Button>
    ),
    login: (
      <Button
        variant="primary"
        onClick={() => {
          onDismiss();
          onLogin?.();
        }}
      >
        Log in again
      </Button>
    ),
    dismiss: (
      <Button variant="primary" onClick={onDismiss}>
        OK
      </Button>
    ),
  }[p.primary];

  return (
    <Modal
      open
      title={p.title}
      onClose={onDismiss}
      icon={
        <span className={styles.icon}>
          <Icon name={p.icon} size={20} />
        </span>
      }
      footer={
        <>
          {p.primary !== 'dismiss' && (
            <Button variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          )}
          {primary}
        </>
      }
    >
      <Text>{friendlyMessage(error)}</Text>
      <div className={styles.reference}>
        <Text variant="caption" tone="muted">
          Reference (share this if you contact support)
        </Text>
        <Text variant="mono" tone="secondary">
          {error.code} · HTTP {error.status || '—'}
          {error.occurredAt ? ` · ${new Date(error.occurredAt).toLocaleTimeString('en-IN')}` : ''}
        </Text>
      </div>
    </Modal>
  );
}

/** The app-wide instance, driven by state.errors. */
export function GlobalExceptionModal() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const exception = useSelector((state: RootState) => state.errors.exception);
  const dismiss = useCallback(() => dispatch(exceptionDismissed()), [dispatch]);
  const retryAction: AppAction | null | undefined = exception?.retryAction;

  return (
    <ExceptionModal
      error={exception}
      onDismiss={dismiss}
      onRetry={retryAction ? () => dispatch(retryAction) : undefined}
      onLogin={() => {
        dispatch({ type: LOGOUT });
        navigate(ROUTE_LOGIN, { state: { from: location.pathname } });
      }}
    />
  );
}
