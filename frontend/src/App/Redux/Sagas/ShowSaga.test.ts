import { runSaga } from 'redux-saga';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../Models/HttpModels';
import { BookingService } from '../../Services/BookingService';
import { AppAction } from '../Actions/AppAction';
import { EXCEPTION_RAISED } from '../Actions/ErrorConstants';
import { SEATS_CLEARED, SEATS_HOLD_FAILURE, SEATS_HOLD_SUCCESS, SHOW_REQUEST } from '../Actions/ShowConstants';
import { holdSeatsSaga } from './ShowSaga';

// Sagas are tested by running them against a fake store and checking what they dispatch.
vi.mock('../../Services/BookingService', () => ({ BookingService: { create: vi.fn() } }));

const state = { show: { showId: 1, selected: [4, 5] } };

async function run(saga: () => Generator): Promise<AppAction[]> {
  const dispatched: AppAction[] = [];
  await runSaga({ dispatch: (a: AppAction) => dispatched.push(a), getState: () => state }, saga).toPromise();
  return dispatched;
}

describe('holdSeatsSaga', () => {
  beforeEach(() => vi.clearAllMocks());

  it('holds the selected seats of the current show', async () => {
    vi.mocked(BookingService.create).mockResolvedValue({ id: 9, status: 'PENDING' } as never);

    const actions = await run(holdSeatsSaga);

    expect(BookingService.create).toHaveBeenCalledWith(1, [4, 5]);
    expect(actions.map((a) => a.type)).toEqual([SEATS_HOLD_SUCCESS]);
  });

  it('on 409 (someone else got there first) clears the picks and reloads the seat map', async () => {
    vi.mocked(BookingService.create).mockRejectedValue(new ApiError(409, 'CONFLICT', 'Seat taken'));

    const actions = await run(holdSeatsSaga);

    expect(actions.map((a) => a.type)).toEqual([SEATS_HOLD_FAILURE, SEATS_CLEARED, SHOW_REQUEST]);
    expect(actions.some((a) => a.type === EXCEPTION_RAISED)).toBe(false); // expected error: shown inline, no modal
  });

  it('a server outage pops the global error modal', async () => {
    vi.mocked(BookingService.create).mockRejectedValue(new ApiError(0, 'NETWORK', 'offline'));

    const actions = await run(holdSeatsSaga);

    expect(actions.map((a) => a.type)).toContain(EXCEPTION_RAISED);
  });
});
