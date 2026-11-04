import { AppError } from './HttpModels';

/*
 * Every piece of server data in Redux has the same four fields, so every page
 * handles loading / error / data the same way.
 */
export interface RequestState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
  err: AppError | null;
}

export const initialRequestState = <T>(): RequestState<T> => ({
  data: null,
  loading: false,
  error: false,
  err: null,
});
