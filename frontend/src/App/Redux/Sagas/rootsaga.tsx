import { all, call, spawn } from 'redux-saga/effects';
import agentSaga from './AgentSaga';
import authSaga from './AuthSaga';
import bookingSaga from './BookingSaga';
import eventSaga from './EventSaga';
import showSaga from './ShowSaga';
import toastSaga from './ToastSaga';

const sagas = [authSaga, eventSaga, showSaga, bookingSaga, agentSaga, toastSaga];

/*
 * Start every feature saga. Each runs in its own "keepAlive" wrapper, so a bug
 * that crashes one saga restarts just that one instead of silently stopping all of them.
 */
export default function* rootSaga() {
  yield all(
    sagas.map((saga) =>
      spawn(function* keepAlive() {
        while (true) {
          try {
            yield call(saga);
            break;
          } catch (error) {
            console.error(`Saga ${saga.name} crashed and will restart`, error);
          }
        }
      }),
    ),
  );
}
