import { MAX_SEATS_PER_BOOKING } from '../../Constants/variableConstant';
import { Booking } from '../../Models/Booking';
import { RequestState, initialRequestState } from '../../Models/RequestState';
import { ShowDetail } from '../../Models/Show';
import { failed, started, succeeded } from '../../Utils/requestState';
import { AppAction } from '../Actions/AppAction';
import { LOGOUT, SESSION_EXPIRED } from '../Actions/AuthConstants';
import {
  SEATS_CLEARED,
  SEATS_HOLD_FAILURE,
  SEATS_HOLD_REQUEST,
  SEATS_HOLD_RESET,
  SEATS_HOLD_SUCCESS,
  SEAT_TOGGLED,
  SHOW_FAILURE,
  SHOW_REQUEST,
  SHOW_SUCCESS,
} from '../Actions/ShowConstants';

/*
 * The seat map page. The SELECTION lives in Redux (not in the component), so it
 * survives the detour through the login page: pick seats -> log in -> come back,
 * and your seats are still selected.
 */
export interface ShowState {
  showId: number | null;
  detail: RequestState<ShowDetail>;
  selected: number[]; // seat ids, in the order they were picked
  notice: string | null; // e.g. "You can select up to 10 seats."
  hold: RequestState<Booking>; // POST /api/bookings: the PENDING booking once seats are held
}

const initialState: ShowState = {
  showId: null,
  detail: initialRequestState<ShowDetail>(),
  selected: [],
  notice: null,
  hold: initialRequestState<Booking>(),
};

export const showReducer = (state = initialState, action: AppAction): ShowState => {
  switch (action.type) {
    case SHOW_REQUEST: {
      const { showId } = action.payload as { showId: number };
      if (showId !== state.showId) {
        return { ...initialState, showId, detail: started(initialRequestState<ShowDetail>()) };
      }
      return { ...state, detail: started(state.detail) }; // refresh: keep the old map on screen meanwhile
    }
    case SHOW_SUCCESS: {
      const show = action.payload as ShowDetail;
      // Drop picks that someone else took since we last looked.
      const free = new Set(show.seats.filter((s) => s.status === 'AVAILABLE').map((s) => s.id));
      return { ...state, detail: succeeded(show), selected: state.selected.filter((id) => free.has(id)) };
    }
    case SHOW_FAILURE:
      return { ...state, detail: failed(state.detail, action.err) };
    case SEAT_TOGGLED: {
      const seatId = action.payload as number;
      if (state.selected.includes(seatId)) {
        return {
          ...state,
          selected: state.selected.filter((id) => id !== seatId),
          notice: null,
          hold: { ...state.hold, err: null, error: false },
        };
      }
      if (state.selected.length >= MAX_SEATS_PER_BOOKING) {
        return { ...state, notice: `You can select up to ${MAX_SEATS_PER_BOOKING} seats.` };
      }
      return {
        ...state,
        selected: [...state.selected, seatId],
        notice: null,
        hold: { ...state.hold, err: null, error: false },
      };
    }
    case SEATS_CLEARED:
      return { ...state, selected: [], notice: null };
    case SEATS_HOLD_REQUEST:
      return { ...state, hold: started(state.hold) };
    case SEATS_HOLD_SUCCESS:
      return { ...state, hold: succeeded(action.payload as Booking), selected: [] };
    case SEATS_HOLD_FAILURE:
      return { ...state, hold: failed(state.hold, action.err) };
    case SEATS_HOLD_RESET:
      return { ...state, hold: initialRequestState<Booking>() };
    case LOGOUT:
    case SESSION_EXPIRED:
      return { ...state, hold: initialRequestState<Booking>() };
    default:
      return state;
  }
};
