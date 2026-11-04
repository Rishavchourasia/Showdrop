import { eventsApiUrl } from '../Constants/urlConstants';
import { EventDetail, EventSummary } from '../Models/Event';
import { httpGet } from './httpServices';

export class EventService {
  static async list(): Promise<EventSummary[]> {
    return await httpGet<EventSummary[]>(eventsApiUrl);
  }

  static async get(id: number): Promise<EventDetail> {
    return await httpGet<EventDetail>(`${eventsApiUrl}/${id}`);
  }
}
