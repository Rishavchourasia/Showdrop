import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppAction } from '../../Redux/Actions/AppAction';
import { exceptionRaised } from '../../Redux/Actions/ErrorActions';

/**
 * Show the global ExceptionModal from any component:
 *   const showException = useException();
 *   showException(error, { type: SHOW_REQUEST, payload: { showId } }); // optional retry
 */
export function useException() {
  const dispatch = useDispatch();
  return useCallback(
    (error: unknown, retryAction?: AppAction | null) => dispatch(exceptionRaised(error, retryAction)),
    [dispatch],
  );
}
