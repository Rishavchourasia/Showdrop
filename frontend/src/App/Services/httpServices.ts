import { ApiError, FieldError } from '../Models/HttpModels';
import { codeForStatus } from '../Utils/errors';
import { infoStore } from '../Utils/InfoStore';

/*
 * The ONE place that does fetch(). This is where frontend meets backend: a plain
 * HTTP request with JSON in and JSON out (you could make the same calls with curl).
 * It attaches the JWT, and turns every failure into an ApiError with one shape.
 */
export function hasAuthToken(): boolean {
  return infoStore.getAuthToken() !== null;
}

function buildHeaders(authRequired: boolean, hasBody: boolean) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = authRequired ? infoStore.getAuthToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`; // the "wristband" the backend's JwtAuthFilter checks
  return headers;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Spring: {message, fieldErrors: {email: "..."}}.  FastAPI: {detail: "..."}. */
export function toApiError(status: number, data: unknown): ApiError {
  const body = data as { message?: string; detail?: unknown; fieldErrors?: Record<string, string> } | null;
  const fieldErrors: FieldError[] = Object.entries(body?.fieldErrors ?? {}).map(([field, message]) => ({
    field,
    message,
  }));
  const message = body?.message ?? (typeof body?.detail === 'string' ? body.detail : null);
  return new ApiError(
    status,
    codeForStatus(status, fieldErrors.length > 0),
    message ?? `Request failed (${status})`,
    fieldErrors,
  );
}

async function send<T>(method: 'GET' | 'POST' | 'DELETE', url: string, authRequired: boolean, body?: unknown) {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: buildHeaders(authRequired, body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // fetch only throws when there was no HTTP response at all (server down, offline).
    throw new ApiError(0, 'NETWORK', "Can't reach the server. Check your connection and try again.");
  }

  const data = await readJson(res);
  if (res.ok) return data as T;
  throw toApiError(res.status, data);
}

export async function httpGet<T>(url: string, authRequired = false): Promise<T> {
  return send<T>('GET', url, authRequired);
}

export async function httpPost<T>(url: string, authRequired = false, body: unknown = {}): Promise<T> {
  return send<T>('POST', url, authRequired, body);
}

export async function httpDelete<T>(url: string, authRequired = false): Promise<T> {
  return send<T>('DELETE', url, authRequired);
}
