import type { IconName } from '../Components/CustomUI';
import { AppError } from '../Models/HttpModels';

export function toAppError(e: unknown): AppError {
  if (isAppError(e)) return e;
  return { status: 0, code: 'UNKNOWN', message: e instanceof Error ? e.message : String(e), fieldErrors: [] };
}

function isAppError(e: unknown): e is AppError {
  return typeof e === 'object' && e !== null && 'code' in e && 'status' in e && 'message' in e;
}

/** Turn an HTTP status into a stable code the UI can switch on. */
export function codeForStatus(status: number, hasFieldErrors: boolean): string {
  if (status === 400 && hasFieldErrors) return 'VALIDATION_FAILED';
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    502: 'SERVICE_UNAVAILABLE', // nginx: the service behind it is down
    503: 'SERVICE_UNAVAILABLE',
    504: 'SERVICE_UNAVAILABLE', // nginx: the service didn't answer in time
  };
  return codes[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : `HTTP_${status}`);
}

const SYSTEM_CODES = new Set(['NETWORK', 'UNKNOWN', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE', 'RATE_LIMITED']);

/**
 * "Unexpected" = not the user's fault (server down, bug). These get the global
 * ExceptionModal; expected ones (seat taken, wrong password) are shown inline.
 */
export function isUnexpected(e: AppError): boolean {
  return e.status === 0 || e.status >= 500 || SYSTEM_CODES.has(e.code);
}

/** The error to show next to a form, or null if the global modal handles it. */
export function formError(e: AppError | null | undefined): AppError | null {
  return e && !isUnexpected(e) ? e : null;
}

const FRIENDLY: Record<string, string> = {
  NETWORK: "Can't reach Showdrop. Check your connection, or make sure the backend is running.",
  SERVICE_UNAVAILABLE: 'Part of Showdrop is temporarily unavailable. Please try again in a moment.',
  INTERNAL_ERROR: 'Something went wrong on our side. Please try again.',
  RATE_LIMITED: "You're going a bit fast. Wait a few seconds and try again.",
  SESSION_EXPIRED: 'For your security you were logged out. Please log in again.',
};

export function friendlyMessage(e: AppError): string {
  if (e.code === 'VALIDATION_FAILED' && e.fieldErrors.length) {
    return e.fieldErrors.map((f) => `${f.field}: ${f.message}`).join(' · ');
  }
  // Our backend writes user-friendly messages for 4xx errors, so prefer them.
  if (e.status >= 400 && e.status < 500 && e.message) return e.message;
  return FRIENDLY[e.code] ?? e.message ?? FRIENDLY.INTERNAL_ERROR;
}

export interface ErrorPresentation {
  title: string;
  icon: IconName;
  /** The modal's main button: retry the request, log in again, or just close. */
  primary: 'retry' | 'login' | 'dismiss';
}

/** How the ExceptionModal should show this error. */
export function presentError(e: AppError): ErrorPresentation {
  if (e.code === 'SESSION_EXPIRED') return { title: 'Your session expired', icon: 'logout', primary: 'login' };
  if (e.code === 'NETWORK') return { title: "Can't reach the server", icon: 'alert', primary: 'retry' };
  if (e.code === 'RATE_LIMITED') return { title: 'Slow down a little', icon: 'clock', primary: 'dismiss' };
  if (e.status === 503 || e.code.endsWith('UNAVAILABLE')) {
    return { title: 'A service is taking a break', icon: 'clock', primary: 'retry' };
  }
  if (e.status >= 400 && e.status < 500) return { title: "That didn't work", icon: 'alert', primary: 'dismiss' };
  return { title: 'Something went wrong', icon: 'alert', primary: 'retry' };
}
