import { all, put, takeLatest } from 'redux-saga/effects';
import { EventDetail, EventSummary } from '../../Models/Event';
import { AppError } from '../../Models/HttpModels';
import { EventService } from '../../Services/EventService';
import { callApi } from '../../Utils/sagaHelpers';
import { AppAction } from '../Actions/AppAction';
import {
  EVENTS_FAILURE,
  EVENTS_REQUEST,
  EVENTS_SUCCESS,
  EVENT_DETAIL_FAILURE,
  EVENT_DETAIL_REQUEST,
  EVENT_DETAIL_SUCCESS,
} from '../Actions/EventConstants';

function* fetchEventsSaga() {
  try {
    const events: EventSummary[] = yield* callApi(EventService.list);
    yield put({ type: EVENTS_SUCCESS, payload: events, error: false, err: null });
  } catch (error) {
    yield put({ type: EVENTS_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

function* fetchEventDetailSaga({ payload }: AppAction) {
  const { eventId } = payload as { eventId: number };
  try {
    const event: EventDetail = yield* callApi(EventService.get, eventId);
    yield put({ type: EVENT_DETAIL_SUCCESS, payload: event, error: false, err: null });
  } catch (error) {
    yield put({ type: EVENT_DETAIL_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

export default function* eventSaga() {
  yield all([takeLatest(EVENTS_REQUEST, fetchEventsSaga), takeLatest(EVENT_DETAIL_REQUEST, fetchEventDetailSaga)]);
}
