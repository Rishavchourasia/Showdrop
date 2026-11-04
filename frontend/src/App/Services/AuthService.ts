import { authApiBaseUrl } from '../Constants/urlConstants';
import { AuthResponse, User } from '../Models/User';
import { httpGet, httpPost } from './httpServices';

/* One class per backend resource; one static method per endpoint. Components never build URLs. */
export class AuthService {
  static async login(email: string, password: string): Promise<AuthResponse> {
    return await httpPost<AuthResponse>(`${authApiBaseUrl}/login`, false, { email, password });
  }

  static async signup(email: string, password: string, fullName: string): Promise<AuthResponse> {
    return await httpPost<AuthResponse>(`${authApiBaseUrl}/signup`, false, { email, password, fullName });
  }

  static async me(): Promise<User> {
    return await httpGet<User>(`${authApiBaseUrl}/me`, true);
  }
}
