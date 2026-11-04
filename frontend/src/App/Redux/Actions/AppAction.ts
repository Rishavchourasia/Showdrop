import { UnknownAction } from 'redux';

/*
 * Every Redux action has this shape:
 *   { type: 'SHOW_REQUEST', payload: { showId: 1 } }          -> "please load show 1"
 *   { type: 'SHOW_FAILURE', error: true, err: <AppError> }     -> "it failed, here's why"
 *
 * WHY Redux + redux-saga?
 *   - Components only DISPATCH actions ("user clicked Pay") and SELECT state.
 *   - Sagas do the side effects (API calls, timers) when they see an action.
 *   - Reducers are pure functions: (oldState, action) -> newState. Easy to test.
 * So every change to app data goes through one predictable path you can log and test.
 */
export interface AppAction extends UnknownAction {
  type: string;
  payload?: unknown;
  error?: boolean;
  err?: unknown;
}
