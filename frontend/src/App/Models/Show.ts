import { EventSummary, ShowSummary } from './Event';

// AVAILABLE / BOOKED come from Postgres, HELD comes from Redis (someone is in checkout).
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';

export interface Seat {
  id: number;
  rowLabel: string;
  seatNumber: number;
  category: 'REGULAR' | 'PREMIUM';
  price: number;
  status: SeatStatus;
}

export interface ShowDetail extends ShowSummary {
  event: EventSummary;
  holdMinutes: number;
  seats: Seat[];
}
