import { ChatMessage } from '../Models/Agent';
import { AuthResponse, User } from '../Models/User';

/*
 * The ONLY place that touches browser storage. Every call is wrapped in
 * try/catch because storage can be unavailable (private mode, blocked cookies),
 * and the app should keep working, just without remembering.
 *
 *   localStorage   login token + user: survives a page refresh or browser restart
 *   sessionStorage AI chat: kept while the tab is open, separate per user
 */
const TOKEN_KEY = 'bys.token';
const USER_KEY = 'bys.user';
const chatKey = (userId: number | null) => `bys.chat.${userId ?? 'anon'}`;
const WAITLIST_KEY = 'bys.musicWaitlist'; // UI-only until the music backend exists

export interface StoredChat {
  conversationId: string | null;
  messages: ChatMessage[];
}

export const infoStore = {
  getAuthToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },

  saveSession(res: AuthResponse): void {
    try {
      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    } catch {
      return;
    }
  },

  deleteSession(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      return;
    }
  },

  getChat(userId: number | null): StoredChat {
    try {
      const raw = sessionStorage.getItem(chatKey(userId));
      if (raw) return JSON.parse(raw) as StoredChat;
    } catch {
      /* fall through to an empty chat */
    }
    return { conversationId: null, messages: [] };
  },

  saveChat(userId: number | null, chat: StoredChat): void {
    try {
      sessionStorage.setItem(chatKey(userId), JSON.stringify(chat));
    } catch {
      return;
    }
  },

  getWaitlistEmail(): string | null {
    try {
      return localStorage.getItem(WAITLIST_KEY);
    } catch {
      return null;
    }
  },

  joinWaitlist(email: string): void {
    try {
      localStorage.setItem(WAITLIST_KEY, email);
    } catch {
      return;
    }
  },
};
