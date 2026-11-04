import type { AppError } from '../../Models/HttpModels';
import { toAppError } from '../../Utils/errors';
import type { AppAction } from './AppAction';
import { EXCEPTION_DISMISSED, EXCEPTION_RAISED } from './ErrorConstants';

/*
 * Action creators for the global ExceptionModal: one way to show it, from anywhere.
 *   in a saga:      yield put(exceptionRaised(error))
 *   in a component: const showException = useException(); showException(error, retryAction)
 *
 * `retryAction` is what "Try again" re-dispatches. If you don't pass one, the
 * modal retries the last *_REQUEST the app made (usually the one that failed).
 */
export interface RaisedException extends AppError {
  occurredAt: string;
  retryAction?: AppAction | null;
}

export const exceptionRaised = (error: unknown, retryAction?: AppAction | null): AppAction => ({
  type: EXCEPTION_RAISED,
  payload: { ...toAppError(error), occurredAt: new Date().toISOString(), retryAction } satisfies RaisedException,
});

export const exceptionDismissed = (): AppAction => ({ type: EXCEPTION_DISMISSED });
