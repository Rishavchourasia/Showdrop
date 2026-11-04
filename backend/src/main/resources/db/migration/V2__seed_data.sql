-- ===========================================================================
-- V2: sample data so the app isn't empty on first run.
-- (Users are NOT seeded here: a demo user is created by DataInitializer.java,
--  because the password must be hashed with the app's own PasswordEncoder.)
-- ===========================================================================

INSERT INTO events (title, description, category, language, duration_minutes, poster_url) VALUES
 ('Starfall',
  'A stranded astronaut races against time to signal home in this visually stunning sci-fi thriller.',
  'Movie', 'English', 142, 'https://picsum.photos/seed/starfall/400/600'),
 ('The Midnight Echoes - Live',
  'The indie-rock band brings their sold-out arena tour to your city for one night only.',
  'Concert', 'Hindi', 150, 'https://picsum.photos/seed/echoes/400/600'),
 ('Laugh Riot: Stand-up Night',
  'Five of the country''s sharpest comedians, one stage, zero filters.',
  'Comedy', 'Hinglish', 120, 'https://picsum.photos/seed/laughriot/400/600'),
 ('Hamlet',
  'A bold modern staging of Shakespeare''s tragedy of revenge, madness and indecision.',
  'Theatre', 'English', 165, 'https://picsum.photos/seed/hamlet/400/600');

-- Three shows per event. Times are relative to when this migration runs, so
-- the shows are in the near future on a fresh database. The arithmetic is done
-- in India time (so "18 hours" means 6pm IST) and converted back to an instant.
INSERT INTO shows (event_id, venue_name, city, start_time)
SELECT e.id, v.venue_name, v.city,
       (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + v.offset_from_today) AT TIME ZONE 'Asia/Kolkata'
FROM events e
CROSS JOIN (VALUES
    ('PVR Phoenix Palladium', 'Mumbai',    INTERVAL '1 day 18 hours'),
    ('INOX Forum Mall',       'Bengaluru', INTERVAL '1 day 21 hours'),
    ('Cinepolis DLF Place',   'Delhi',     INTERVAL '2 days 15 hours 30 minutes')
) AS v(venue_name, city, offset_from_today)
ORDER BY e.id, v.offset_from_today;

-- A 6 x 10 grid for every show: rows A-D are REGULAR, E-F (at the back) are PREMIUM.
INSERT INTO seats (show_id, row_label, seat_number, category, price, status)
SELECT s.id,
       r.label,
       n,
       CASE WHEN r.label IN ('E', 'F') THEN 'PREMIUM' ELSE 'REGULAR' END,
       CASE WHEN r.label IN ('E', 'F') THEN 350.00    ELSE 200.00    END,
       'AVAILABLE'
FROM shows s
CROSS JOIN (VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')) AS r(label)
CROSS JOIN generate_series(1, 10) AS n
ORDER BY s.id, r.label, n;   -- so seat ids run A1, A2, ... F10 within each show
