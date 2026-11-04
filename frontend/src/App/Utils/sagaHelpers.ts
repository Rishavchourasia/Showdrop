import { call, put } from 'redux-saga/effects';
import { AppError } from '../Models/HttpModels';
import { SESSION_EXPIRED } from '../Redux/Actions/AuthConstants';
import { exceptionRaised } from '../Redux/Actions/ErrorActions';
import { hasAuthToken } from '../Services/httpServices';
import { isUnexpected, toAppError } from './errors';

type AsyncFn = (...args: never[]) => Promise<unknown>;

/*
 * Every saga calls the API through these, so error handling is written ONCE:
 *  - a 401 while logged in   -> SESSION_EXPIRED (log out) + "session expired" modal
 *  - an unexpected error     -> global ExceptionModal (callApi only)
 *  - always re-throws, so the calling saga can still dispatch its own *_FAILURE action
 *
 * callApi        the default: unexpected errors (server down, 5xx) pop the ExceptionModal
 * callApiHandled when the caller shows the error itself (the AI chat shows it inside the chat)
 */
export function* callApi<F extends AsyncFn>(fn: F, ...args: Parameters<F>) {
  return yield* invoke(true, fn, ...args);
}

export function* callApiHandled<F extends AsyncFn>(fn: F, ...args: Parameters<F>) {
  return yield* invoke(false, fn, ...args);
}

function* invoke<F extends AsyncFn>(useModal: boolean, fn: F, ...args: Parameters<F>) {
  try {
    return (yield call(fn, ...args)) as Awaited<ReturnType<F>>;
  } catch (e) {
    const error: AppError = toAppError(e);
    if (error.status === 401 && hasAuthToken()) {
      yield put({ type: SESSION_EXPIRED });
      yield put(exceptionRaised(sessionExpired(), null));
    } else if (useModal && isUnexpected(error)) {
      yield put(exceptionRaised(error));
    }
    throw error;
  }
}

function sessionExpired(): AppError {
  return { status: 401, code: 'SESSION_EXPIRED', message: 'Your session has expired.', fieldErrors: [] };
}
