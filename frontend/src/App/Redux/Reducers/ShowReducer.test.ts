import { describe, expect, it } from 'vitest';
import type { ShowDetail } from '../../Models/Show';
import { SEATS_HOLD_SUCCESS, SEAT_TOGGLED, SHOW_REQUEST, SHOW_SUCCESS } from '../Actions/ShowConstants';
import { showReducer } from './ShowReducer';

// Reducers are pure functions, so testing them is just: state in, action in, check state out.
const show = (statuses: Record<number, 'AVAILABLE' | 'HELD' | 'BOOKED'>) =>
  ({
    id: 1,
    seats: Object.entries(statuses).map(([id, status]) => ({ id: Number(id), status })),
  }) as unknown as ShowDetail;

const loaded = () => {
  let s = showReducer(undefined, { type: SHOW_REQUEST, payload: { showId: 1 } });
  s = showReducer(s, { type: SHOW_SUCCESS, payload: show({ 1: 'AVAILABLE', 2: 'AVAILABLE', 3: 'AVAILABLE' }) });
  return s;
};

describe('show reducer (seat selection)', () => {
  it('toggles seats on and off', () => {
    let s = loaded();
    s = showReducer(s, { type: SEAT_TOGGLED, payload: 1 });
    s = showReducer(s, { type: SEAT_TOGGLED, payload: 2 });
    expect(s.selected).toEqual([1, 2]);
    s = showReducer(s, { type: SEAT_TOGGLED, payload: 1 });
    expect(s.selected).toEqual([2]);
  });

  it('refuses more than 10 seats and explains why', () => {
    let s = loaded();
    for (let id = 1; id <= 11; id++) s = showReducer(s, { type: SEAT_TOGGLED, payload: id });
    expect(s.selected).toHaveLength(10);
    expect(s.notice).toMatch(/up to 10/);
  });

  it('a refreshed map drops picks that someone else just took', () => {
    let s = showReducer(loaded(), { type: SEAT_TOGGLED, payload: 1 });
    s = showReducer(s, { type: SEAT_TOGGLED, payload: 2 });
    s = showReducer(s, { type: SHOW_SUCCESS, payload: show({ 1: 'HELD', 2: 'AVAILABLE', 3: 'BOOKED' }) });
    expect(s.selected).toEqual([2]);
  });

  it('opening a different show starts a fresh selection; refreshing the same show keeps it', () => {
    const picked = showReducer(loaded(), { type: SEAT_TOGGLED, payload: 1 });
    expect(showReducer(picked, { type: SHOW_REQUEST, payload: { showId: 1 } }).selected).toEqual([1]);
    expect(showReducer(picked, { type: SHOW_REQUEST, payload: { showId: 2 } }).selected).toEqual([]);
  });

  it('holding the seats clears the selection and stores the booking', () => {
    const picked = showReducer(loaded(), { type: SEAT_TOGGLED, payload: 1 });
    const s = showReducer(picked, { type: SEATS_HOLD_SUCCESS, payload: { id: 7 } });
    expect(s.selected).toEqual([]);
    expect(s.hold.data).toEqual({ id: 7 });
  });
});
