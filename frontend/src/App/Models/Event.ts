// Mirrors the backend's EventDtos. Dates arrive as ISO strings, e.g. "2026-10-14T12:30:00Z".
export interface EventSummary {
  id: number;
  title: string;
  category: string;
  language: string;
  durationMinutes: number;
  posterUrl: string | null;
}

export interface ShowSummary {
  id: number;
  venueName: string;
  city: string;
  startTime: string;
}

export interface EventDetail extends EventSummary {
  description: string;
  shows: ShowSummary[];
}
