import { AppError } from '../../Models/HttpModels';
import { Booking } from '../../Models/Booking';
import { RequestState, initialRequestState } from '../../Models/RequestState';
import { failed, started, succeeded } from '../../Utils/requestState';
import { AppAction } from '../Actions/AppAction';
import { LOGOUT, SESSION_EXPIRED } from '../Actions/AuthConstants';
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

export interface BookingActionState {
  kind: 'confirm' | 'cancel' | null; // which button is busy
  error: boolean;
  err: AppError | null;
}

export interface BookingState {
  mine: RequestState<Booking[]>; // "My bookings" page
  current: RequestState<Booking>; // the checkout page's booking
  action: BookingActionState; // Pay / Cancel in progress
}

const idleAction: BookingActionState = { kind: null, error: false, err: null };

const initialState: BookingState = {
  mine: initialRequestState<Booking[]>(),
  current: initialRequestState<Booking>(),
  action: idleAction,
};

export const bookingReducer = (state = initialState, action: AppAction): BookingState => {
  switch (action.type) {
    case MY_BOOKINGS_REQUEST:
      return { ...state, mine: started(state.mine) };
    case MY_BOOKINGS_SUCCESS:
      return { ...state, mine: succeeded(action.payload as Booking[]) };
    case MY_BOOKINGS_FAILURE:
      return { ...state, mine: failed(state.mine, action.err) };
    case BOOKING_REQUEST: {
      const { bookingId } = action.payload as { bookingId: number };
      const same = state.current.data?.id === bookingId;
      return {
        ...state,
        current: started(same ? state.current : initialRequestState<Booking>()),
        action: idleAction,
      };
    }
    case BOOKING_SUCCESS:
      return { ...state, current: succeeded(action.payload as Booking) };
    case BOOKING_FAILURE:
      return { ...state, current: failed(state.current, action.err) };
    case BOOKING_CONFIRM_REQUEST:
      return { ...state, action: { kind: 'confirm', error: false, err: null } };
    case BOOKING_CANCEL_REQUEST:
      return { ...state, action: { kind: 'cancel', error: false, err: null } };
    case BOOKING_CONFIRM_SUCCESS:
    case BOOKING_CANCEL_SUCCESS:
      return { ...state, current: succeeded(action.payload as Booking), action: idleAction };
    case BOOKING_CONFIRM_FAILURE:
    case BOOKING_CANCEL_FAILURE:
      return { ...state, action: { kind: null, error: true, err: action.err as AppError } };
    case LOGOUT:
    case SESSION_EXPIRED:
      return initialState; // never show the previous user's bookings
    default:
      return state;
  }
};
