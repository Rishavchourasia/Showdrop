import { describe, expect, it } from 'vitest';
import { toApiError } from './httpServices';

describe('toApiError (one error shape for every server)', () => {
  it('reads a Spring validation error with field errors', () => {
    const e = toApiError(400, { message: 'email must be valid', fieldErrors: { email: 'must be valid' } });
    expect(e).toMatchObject({ status: 400, code: 'VALIDATION_FAILED', message: 'email must be valid' });
    expect(e.fieldErrors).toEqual([{ field: 'email', message: 'must be valid' }]);
  });

  it('maps status codes to stable codes', () => {
    expect(toApiError(409, { message: 'Seat taken' }).code).toBe('CONFLICT');
    expect(toApiError(401, null).code).toBe('UNAUTHORIZED');
    expect(toApiError(500, null).code).toBe('INTERNAL_ERROR');
    expect(toApiError(502, null).code).toBe('SERVICE_UNAVAILABLE');
  });

  it('reads a FastAPI error ({detail})', () => {
    const e = toApiError(503, { detail: 'AI not configured' });
    expect(e).toMatchObject({ code: 'SERVICE_UNAVAILABLE', message: 'AI not configured' });
  });
});
