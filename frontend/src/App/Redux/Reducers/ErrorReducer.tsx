import { AppAction } from '../Actions/AppAction';
import { LOGIN_REQUEST, SIGNUP_REQUEST } from '../Actions/AuthConstants';
import type { RaisedException } from '../Actions/ErrorActions';
import { EXCEPTION_DISMISSED, EXCEPTION_RAISED } from '../Actions/ErrorConstants';

/*
 * The one "unexpected error" shown in the global ExceptionModal (server down,
 * session expired...), plus the last request made, so "Try again" can repeat it.
 */
export interface ErrorState {
  exception: RaisedException | null;
  lastRequest: AppAction | null;
}

const initialState: ErrorState = { exception: null, lastRequest: null };

// Never keep (and re-send) actions that carry a password.
const NOT_RETRYABLE = new Set([LOGIN_REQUEST, SIGNUP_REQUEST]);

export const errorReducer = (state = initialState, action: AppAction): ErrorState => {
  switch (action.type) {
    case EXCEPTION_RAISED: {
      const raised = action.payload as RaisedException;
      // undefined = "not specified" -> retry the last request; null = "nothing to retry".
      const retryAction = raised.retryAction === undefined ? state.lastRequest : raised.retryAction;
      return { ...state, exception: { ...raised, retryAction } };
    }
    case EXCEPTION_DISMISSED:
      return { ...state, exception: null };
    default:
      if (action.type.endsWith('_REQUEST') && !NOT_RETRYABLE.has(action.type)) {
        return { ...state, lastRequest: action };
      }
      return state;
  }
};
