import { ShowSummary } from './Event';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export interface BookedSeat {
  id: number;
  rowLabel: string;
  seatNumber: number;
  category: string;
  price: number;
}

export interface Booking {
  id: number;
  status: BookingStatus;
  totalAmount: number;
  createdAt: string;
  expiresAt: string | null;
  eventId: number;
  eventTitle: string;
  posterUrl: string | null;
  show: ShowSummary;
  seats: BookedSeat[];
}
