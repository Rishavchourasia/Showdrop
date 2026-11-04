import { AppError } from '../../Models/HttpModels';
import { AuthResponse, User } from '../../Models/User';
import { infoStore } from '../../Utils/InfoStore';
import { AppAction } from '../Actions/AppAction';
import {
  AUTH_ERROR_CLEARED,
  AUTH_FAILURE,
  AUTH_SUCCESS,
  LOGIN_REQUEST,
  LOGOUT,
  SESSION_EXPIRED,
  SIGNUP_REQUEST,
} from '../Actions/AuthConstants';

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: boolean;
  err: AppError | null;
}

// Start logged in if a previous session was saved (survives a page refresh).
const initialState: AuthState = {
  user: infoStore.getUser(),
  token: infoStore.getAuthToken(),
  loading: false,
  error: false,
  err: null,
};

export const authReducer = (state = initialState, action: AppAction): AuthState => {
  switch (action.type) {
    case LOGIN_REQUEST:
    case SIGNUP_REQUEST:
      return { ...state, loading: true, error: false, err: null };
    case AUTH_SUCCESS: {
      const res = action.payload as AuthResponse;
      return { ...state, loading: false, user: res.user, token: res.token };
    }
    case AUTH_FAILURE:
      return { ...state, loading: false, error: true, err: action.err as AppError };
    case AUTH_ERROR_CLEARED:
      return { ...state, error: false, err: null };
    case LOGOUT:
    case SESSION_EXPIRED:
      return { ...state, user: null, token: null, loading: false };
    default:
      return state;
  }
};
