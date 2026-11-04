import { AppError } from '../Models/HttpModels';
import { RequestState } from '../Models/RequestState';

// Tiny helpers so reducers don't repeat the same three object spreads for every request.
export const started = <T>(s: RequestState<T>): RequestState<T> => ({ ...s, loading: true, error: false, err: null });

export const succeeded = <T>(data: T): RequestState<T> => ({ data, loading: false, error: false, err: null });

export const failed = <T>(s: RequestState<T>, err: unknown): RequestState<T> => ({
  ...s,
  loading: false,
  error: true,
  err: err as AppError,
});

/** True only before the very first response: show a skeleton, not stale data. */
export const isFirstLoad = <T>(state: RequestState<T>): boolean => state.data === null && !state.err;
