import { bookingsApiUrl } from '../Constants/urlConstants';
import { Booking } from '../Models/Booking';
import { httpDelete, httpGet, httpPost } from './httpServices';

export class BookingService {
  /** Holds the seats for 5 minutes (Redis) and returns a PENDING booking. */
  static async create(showId: number, seatIds: number[]): Promise<Booking> {
    return await httpPost<Booking>(bookingsApiUrl, true, { showId, seatIds });
  }

  static async get(id: number): Promise<Booking> {
    return await httpGet<Booking>(`${bookingsApiUrl}/${id}`, true);
  }

  /** Simulated payment: PENDING -> CONFIRMED. */
  static async confirm(id: number): Promise<Booking> {
    return await httpPost<Booking>(`${bookingsApiUrl}/${id}/confirm`, true);
  }

  static async cancel(id: number): Promise<Booking> {
    return await httpDelete<Booking>(`${bookingsApiUrl}/${id}`, true);
  }

  static async mine(): Promise<Booking[]> {
    return await httpGet<Booking[]>(`${bookingsApiUrl}/me`, true);
  }
}
