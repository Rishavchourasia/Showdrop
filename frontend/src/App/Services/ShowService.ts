import { showsApiUrl } from '../Constants/urlConstants';
import { ShowDetail } from '../Models/Show';
import { httpGet } from './httpServices';

export class ShowService {
  static async get(id: number): Promise<ShowDetail> {
    return await httpGet<ShowDetail>(`${showsApiUrl}/${id}`);
  }
}
