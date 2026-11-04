import { combineReducers } from 'redux';
import { agentReducer } from './AgentReducer';
import { authReducer } from './AuthReducer';
import { bookingReducer } from './BookingReducer';
import { errorReducer } from './ErrorReducer';
import { eventReducer } from './EventReducer';
import { showReducer } from './ShowReducer';
import { toastReducer } from './ToastReducer';

// The whole app state is one object: state.auth, state.events, state.show ...
const rootReducer = combineReducers({
  auth: authReducer,
  events: eventReducer,
  show: showReducer,
  bookings: bookingReducer,
  agent: agentReducer,
  toasts: toastReducer,
  errors: errorReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
