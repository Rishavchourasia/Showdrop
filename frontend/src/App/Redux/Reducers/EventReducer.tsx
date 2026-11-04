import { EventDetail, EventSummary } from '../../Models/Event';
import { RequestState, initialRequestState } from '../../Models/RequestState';
import { failed, started, succeeded } from '../../Utils/requestState';
import { AppAction } from '../Actions/AppAction';
import {
  EVENTS_FAILURE,
  EVENTS_REQUEST,
  EVENTS_SUCCESS,
  EVENT_DETAIL_FAILURE,
  EVENT_DETAIL_REQUEST,
  EVENT_DETAIL_SUCCESS,
} from '../Actions/EventConstants';

export interface EventState {
  list: RequestState<EventSummary[]>;
  detail: RequestState<EventDetail>;
}

const initialState: EventState = {
  list: initialRequestState<EventSummary[]>(),
  detail: initialRequestState<EventDetail>(),
};

export const eventReducer = (state = initialState, action: AppAction): EventState => {
  switch (action.type) {
    case EVENTS_REQUEST:
      return { ...state, list: started(state.list) };
    case EVENTS_SUCCESS:
      return { ...state, list: succeeded(action.payload as EventSummary[]) };
    case EVENTS_FAILURE:
      return { ...state, list: failed(state.list, action.err) };
    case EVENT_DETAIL_REQUEST: {
      // A different event: drop the old one so its data never flashes on the new page.
      const sameEvent = state.detail.data?.id === (action.payload as { eventId: number }).eventId;
      return { ...state, detail: started(sameEvent ? state.detail : initialRequestState<EventDetail>()) };
    }
    case EVENT_DETAIL_SUCCESS:
      return { ...state, detail: succeeded(action.payload as EventDetail) };
    case EVENT_DETAIL_FAILURE:
      return { ...state, detail: failed(state.detail, action.err) };
    default:
      return state;
  }
};
