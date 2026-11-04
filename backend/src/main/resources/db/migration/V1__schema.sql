-- ===========================================================================
-- V1: the database schema.
--
-- WHY Flyway migrations instead of letting Hibernate create tables?
--   * The schema is written down, reviewed and versioned like code.
--   * Every environment (your laptop, Docker, Kubernetes) runs the exact same
--     files in the same order. Flyway records which ones ran in a table called
--     flyway_schema_history, so each file runs exactly once.
--   * RULE: never edit a migration that has already run. Add V3__..., V4__...
-- ===========================================================================

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,     -- UNIQUE: the DB itself refuses duplicate accounts
    password_hash VARCHAR(255) NOT NULL,            -- BCrypt hash, never the real password
    full_name     VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- An Event is the "thing" (a movie, a concert). It has no date by itself.
CREATE TABLE events (
    id               BIGSERIAL PRIMARY KEY,
    title            VARCHAR(255)  NOT NULL,
    description      VARCHAR(2000) NOT NULL,
    category         VARCHAR(50)   NOT NULL,
    language         VARCHAR(50)   NOT NULL,
    duration_minutes INT           NOT NULL CHECK (duration_minutes > 0),
    poster_url       VARCHAR(500)
);

-- A Show is one occurrence of an event at a place and time.
CREATE TABLE shows (
    id          BIGSERIAL PRIMARY KEY,
    event_id    BIGINT       NOT NULL REFERENCES events (id) ON DELETE CASCADE,  -- foreign key: a show must belong to a real event
    venue_name  VARCHAR(255) NOT NULL,
    city        VARCHAR(100) NOT NULL,
    start_time  TIMESTAMPTZ  NOT NULL   -- TIMESTAMPTZ stores an exact instant; avoids timezone bugs
);
CREATE INDEX idx_shows_event_id ON shows (event_id);  -- WHY: "all shows for event X" is a frequent query

-- Seats belong to a show (simplified model: each show has its own seat rows).
CREATE TABLE seats (
    id          BIGSERIAL PRIMARY KEY,
    show_id     BIGINT        NOT NULL REFERENCES shows (id) ON DELETE CASCADE,
    row_label   VARCHAR(5)    NOT NULL,
    seat_number INT           NOT NULL,
    category    VARCHAR(20)   NOT NULL CHECK (category IN ('REGULAR', 'PREMIUM')),
    price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),   -- NUMERIC, not float: money must be exact
    status      VARCHAR(20)   NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED')),
    -- Optimistic locking counter. Hibernate runs
    --   UPDATE seats SET status='BOOKED', version=version+1 WHERE id=? AND version=?
    -- If someone else changed the row first, 0 rows match and the update fails
    -- instead of silently double-booking.
    version     BIGINT        NOT NULL DEFAULT 0,
    UNIQUE (show_id, row_label, seat_number)                   -- no two "A5"s in the same show
);
CREATE INDEX idx_seats_show_id ON seats (show_id);

CREATE TABLE bookings (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT        NOT NULL REFERENCES users (id),
    show_id      BIGINT        NOT NULL REFERENCES shows (id),
    -- PENDING   = seats held, waiting for payment (Phase 4)
    -- CONFIRMED = paid, seats are BOOKED
    -- CANCELLED = user gave up during checkout
    -- EXPIRED   = hold timed out before payment
    status       VARCHAR(20)   NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    total_amount NUMERIC(10,2) NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ                                 -- only meaningful while PENDING
);
CREATE INDEX idx_bookings_user_id ON bookings (user_id);
CREATE INDEX idx_bookings_status_expires ON bookings (status, expires_at);

-- Join table for the many-to-many Booking <-> Seat relationship.
-- WHY a separate table? A column can't hold a list; one row per (booking, seat) pair can.
CREATE TABLE booking_seats (
    booking_id BIGINT NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    seat_id    BIGINT NOT NULL REFERENCES seats (id),
    PRIMARY KEY (booking_id, seat_id)
);
