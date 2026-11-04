import type { BadgeTone } from '../Components/CustomUI';
import type { BookingStatus } from '../Models/Booking';

// Shortcut prompts shown in the empty AI chat.
export const AGENT_SUGGESTIONS: ReadonlyArray<string> = [
  'What can I watch in Bengaluru?',
  "What's your refund policy?",
  'Find me 2 seats together for Starfall in Mumbai',
];

// Friendly labels for what the agent did behind the scenes -- makes the agent loop visible.
export const AGENT_TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: '📚 Searched help docs',
  search_events: '🎬 Searched events',
  get_show_seats: '💺 Checked seat map',
  hold_seats: '🔒 Held seats',
  get_my_bookings: '🎟️ Looked up your bookings',
};

// Badge colour for each booking status.
export const BOOKING_STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'neutral',
  EXPIRED: 'neutral',
};
