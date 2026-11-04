/*
 * PREVIEW DATA for the Music section (coming soon).
 * There is no music backend yet, so this page is UI only. When the backend
 * lands, replace this file with a MusicService + Redux saga like EventService.
 * All artists and festivals here are fictional.
 */
export interface PreviewGig {
  id: number;
  title: string;
  kind: 'Festival' | 'Club night' | 'Live session' | 'Concert';
  city: string;
  month: string;
  genres: string[];
}

export const PREVIEW_GIGS: ReadonlyArray<PreviewGig> = [
  {
    id: 101,
    title: 'Neon Monsoon Festival',
    kind: 'Festival',
    city: 'Goa',
    month: 'Dec',
    genres: ['Electronic', 'House'],
  },
  { id: 102, title: 'Basement Frequencies', kind: 'Club night', city: 'Bengaluru', month: 'Nov', genres: ['Techno'] },
  {
    id: 103,
    title: 'Lakeside Lo-Fi Sessions',
    kind: 'Live session',
    city: 'Udaipur',
    month: 'Jan',
    genres: ['Lo-fi', 'Indie'],
  },
  { id: 104, title: 'Brass & Bass', kind: 'Concert', city: 'Mumbai', month: 'Dec', genres: ['Jazz', 'Funk'] },
  { id: 105, title: 'Sufi Under the Stars', kind: 'Concert', city: 'Delhi', month: 'Feb', genres: ['Sufi', 'Folk'] },
  { id: 106, title: 'Garage Indie Live', kind: 'Live session', city: 'Pune', month: 'Jan', genres: ['Indie', 'Rock'] },
];

export const GENRES = [
  'Indie',
  'Electronic',
  'Hip-hop',
  'Sufi',
  'Jazz',
  'Rock',
  'Techno',
  'Folk',
  'Lo-fi',
  'Pop',
  'Metal',
  'Classical',
];

export const MUSIC_FEATURES: ReadonlyArray<{
  icon: 'headphones' | 'users' | 'zap' | 'ticket';
  title: string;
  text: string;
}> = [
  {
    icon: 'headphones',
    title: 'Pit, floor & balcony maps',
    text: 'Pick standing zones or seats on a live venue map, just like cinema seats today.',
  },
  {
    icon: 'ticket',
    title: 'Multi-day festival passes',
    text: 'One pass, every day, with add-ons for camping and after-parties.',
  },
  {
    icon: 'zap',
    title: 'Drops & presales',
    text: 'Get a ping the second your favourite artist announces, and a head start on tickets.',
  },
  { icon: 'users', title: 'Book with your crew', text: 'Hold seats for friends and let everyone pay their own share.' },
];
