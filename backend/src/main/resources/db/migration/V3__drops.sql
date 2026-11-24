-- ===========================================================================
-- V3: THE DROP ROOM. A "drop" is a scheduled, fair on-sale for one show.
--
-- Before opens_at, nobody can hold seats for the show; fans wait in a waiting
-- room. At opens_at everyone waiting is shuffled into a random queue, and they
-- are let in `batch_size` at a time, each with `window_seconds` to pick seats.
--
-- Only the SCHEDULE lives in Postgres. The fast-changing parts (who is
-- waiting, queue order, who holds a pass) live in Redis.
-- ===========================================================================
CREATE TABLE drops (
    id             BIGSERIAL PRIMARY KEY,
    show_id        BIGINT      NOT NULL UNIQUE REFERENCES shows (id) ON DELETE CASCADE,  -- at most one drop per show
    opens_at       TIMESTAMPTZ NOT NULL,
    batch_size     INT         NOT NULL DEFAULT 3   CHECK (batch_size > 0),
    window_seconds INT         NOT NULL DEFAULT 120 CHECK (window_seconds >= 30),
    status         VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'OPEN')),
    opened_at      TIMESTAMPTZ
);
CREATE INDEX idx_drops_status ON drops (status);

-- Demo: The Midnight Echoes in Mumbai is a hot concert, so it goes on sale as a drop.
-- (The backend re-schedules it a couple of minutes ahead on startup; see DemoDropInitializer.)
INSERT INTO drops (show_id, opens_at)
SELECT s.id, now() + INTERVAL '3 minutes'
FROM shows s JOIN events e ON e.id = s.event_id
WHERE e.title = 'The Midnight Echoes - Live' AND s.city = 'Mumbai';
