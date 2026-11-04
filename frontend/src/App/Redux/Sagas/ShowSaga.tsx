import { all, put, select, takeLatest } from 'redux-saga/effects';
import { Booking } from '../../Models/Booking';
import { AppError } from '../../Models/HttpModels';
import { ShowDetail } from '../../Models/Show';
import { BookingService } from '../../Services/BookingService';
import { ShowService } from '../../Services/ShowService';
import { callApi } from '../../Utils/sagaHelpers';
import type { RootState } from '../Reducers/reducers';
import type { ShowState } from '../Reducers/ShowReducer';
import { AppAction } from '../Actions/AppAction';
import {
  SEATS_CLEARED,
  SEATS_HOLD_FAILURE,
  SEATS_HOLD_REQUEST,
  SEATS_HOLD_SUCCESS,
  SHOW_FAILURE,
  SHOW_REQUEST,
  SHOW_SUCCESS,
} from '../Actions/ShowConstants';

function* fetchShowSaga({ payload }: AppAction) {
  const { showId } = payload as { showId: number };
  try {
    const show: ShowDetail = yield* callApi(ShowService.get, showId);
    yield put({ type: SHOW_SUCCESS, payload: show, error: false, err: null });
  } catch (error) {
    yield put({ type: SHOW_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

/**
 * "Proceed to pay": hold the selected seats (backend -> Redis SET NX, 5 minutes).
 * The ShowPage watches state.show.hold and moves to checkout when it succeeds.
 */
export function* holdSeatsSaga() {
  const { showId, selected }: ShowState = yield select((state: RootState) => state.show);
  if (showId === null || selected.length === 0) return;
  try {
    const booking: Booking = yield* callApi(BookingService.create, showId, selected);
    yield put({ type: SEATS_HOLD_SUCCESS, payload: booking, error: false, err: null });
  } catch (error) {
    const err = error as AppError;
    yield put({ type: SEATS_HOLD_FAILURE, payload: null, error: true, err });
    // 409 = someone else got (or is holding) one of these seats first.
    // Clear the picks and reload the map so the user sees what's actually free.
    if (err.status === 409) {
      yield put({ type: SEATS_CLEARED });
      yield put({ type: SHOW_REQUEST, payload: { showId } });
    }
  }
}

export default function* showSaga() {
  yield all([takeLatest(SHOW_REQUEST, fetchShowSaga), takeLatest(SEATS_HOLD_REQUEST, holdSeatsSaga)]);
}
