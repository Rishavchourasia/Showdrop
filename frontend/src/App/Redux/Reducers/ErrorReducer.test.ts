import { describe, expect, it } from 'vitest';
import { LOGIN_REQUEST } from '../Actions/AuthConstants';
import { exceptionDismissed, exceptionRaised } from '../Actions/ErrorActions';
import { SHOW_REQUEST } from '../Actions/ShowConstants';
import { errorReducer } from './ErrorReducer';

const offline = { status: 0, code: 'NETWORK', message: 'offline', fieldErrors: [] };

describe('error reducer (global ExceptionModal)', () => {
  it('"Try again" defaults to the last request the app made', () => {
    const load = { type: SHOW_REQUEST, payload: { showId: 2 } };
    let s = errorReducer(undefined, load);
    s = errorReducer(s, exceptionRaised(offline));
    expect(s.exception).toMatchObject({ code: 'NETWORK', retryAction: load });
    expect(s.exception?.occurredAt).toBeTruthy();
  });

  it('an explicit retry action wins, and null means "nothing to retry"', () => {
    const s = errorReducer(errorReducer(undefined, { type: SHOW_REQUEST }), exceptionRaised(offline, null));
    expect(s.exception?.retryAction).toBeNull();
  });

  it('never keeps a login request (it carries a password) as something to retry', () => {
    const s = errorReducer(undefined, { type: LOGIN_REQUEST, payload: { email: 'a', password: 'secret' } });
    expect(s.lastRequest).toBeNull();
  });

  it('dismissing closes the modal', () => {
    const s = errorReducer(errorReducer(undefined, exceptionRaised(offline)), exceptionDismissed());
    expect(s.exception).toBeNull();
  });
});
