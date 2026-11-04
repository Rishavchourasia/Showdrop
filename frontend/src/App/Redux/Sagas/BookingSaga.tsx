import { all, put, takeLatest } from 'redux-saga/effects';
import { Booking } from '../../Models/Booking';
import { AppError } from '../../Models/HttpModels';
import { BookingService } from '../../Services/BookingService';
import { callApi } from '../../Utils/sagaHelpers';
import { AppAction } from '../Actions/AppAction';
import {
  BOOKING_CANCEL_FAILURE,
  BOOKING_CANCEL_REQUEST,
  BOOKING_CANCEL_SUCCESS,
  BOOKING_CONFIRM_FAILURE,
  BOOKING_CONFIRM_REQUEST,
  BOOKING_CONFIRM_SUCCESS,
  BOOKING_FAILURE,
  BOOKING_REQUEST,
  BOOKING_SUCCESS,
  MY_BOOKINGS_FAILURE,
  MY_BOOKINGS_REQUEST,
  MY_BOOKINGS_SUCCESS,
} from '../Actions/BookingConstants';
import { TOAST_SHOWN } from '../Actions/ToastConstants';

function* fetchMyBookingsSaga() {
  try {
    const bookings: Booking[] = yield* callApi(BookingService.mine);
    yield put({ type: MY_BOOKINGS_SUCCESS, payload: bookings, error: false, err: null });
  } catch (error) {
    yield put({ type: MY_BOOKINGS_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

function* fetchBookingSaga({ payload }: AppAction) {
  const { bookingId } = payload as { bookingId: number };
  try {
    const booking: Booking = yield* callApi(BookingService.get, bookingId);
    yield put({ type: BOOKING_SUCCESS, payload: booking, error: false, err: null });
  } catch (error) {
    yield put({ type: BOOKING_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

/** "Pay": PENDING -> CONFIRMED. The backend then publishes booking.confirmed to Kafka. */
export function* confirmBookingSaga({ payload }: AppAction) {
  const { bookingId } = payload as { bookingId: number };
  try {
    const booking: Booking = yield* callApi(BookingService.confirm, bookingId);
    yield put({ type: BOOKING_CONFIRM_SUCCESS, payload: booking, error: false, err: null });
    yield put({
      type: TOAST_SHOWN,
      payload: {
        id: crypto.randomUUID(),
        tone: 'success',
        message: `Booking #${booking.id} confirmed. Enjoy the show!`,
      },
    });
  } catch (error) {
    yield put({ type: BOOKING_CONFIRM_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

function* cancelBookingSaga({ payload }: AppAction) {
  const { bookingId } = payload as { bookingId: number };
  try {
    const booking: Booking = yield* callApi(BookingService.cancel, bookingId);
    yield put({ type: BOOKING_CANCEL_SUCCESS, payload: booking, error: false, err: null });
    yield put({ type: TOAST_SHOWN, payload: { id: crypto.randomUUID(), tone: 'info', message: 'Seats released.' } });
  } catch (error) {
    yield put({ type: BOOKING_CANCEL_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

export default function* bookingSaga() {
  yield all([
    takeLatest(MY_BOOKINGS_REQUEST, fetchMyBookingsSaga),
    takeLatest(BOOKING_REQUEST, fetchBookingSaga),
    takeLatest(BOOKING_CONFIRM_REQUEST, confirmBookingSaga),
    takeLatest(BOOKING_CANCEL_REQUEST, cancelBookingSaga),
  ]);
}
