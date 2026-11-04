import { describe, expect, it } from 'vitest';
import { formError, isUnexpected, presentError } from './errors';

const err = (status: number, code: string) => ({ status, code, message: 'm', fieldErrors: [] });

describe('error classification', () => {
  it('server problems are "unexpected" (global modal); user problems are shown inline', () => {
    expect(isUnexpected(err(0, 'NETWORK'))).toBe(true);
    expect(isUnexpected(err(500, 'INTERNAL_ERROR'))).toBe(true);
    expect(isUnexpected(err(409, 'CONFLICT'))).toBe(false);
    expect(formError(err(409, 'CONFLICT'))).not.toBeNull();
    expect(formError(err(503, 'SERVICE_UNAVAILABLE'))).toBeNull();
  });

  it('picks the right modal for each kind of error', () => {
    expect(presentError(err(401, 'SESSION_EXPIRED')).primary).toBe('login');
    expect(presentError(err(0, 'NETWORK')).primary).toBe('retry');
    expect(presentError(err(503, 'SERVICE_UNAVAILABLE')).primary).toBe('retry');
    expect(presentError(err(404, 'NOT_FOUND')).primary).toBe('dismiss');
  });
});
