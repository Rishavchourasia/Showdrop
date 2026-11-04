# Showdrop 🎟️

A ticket booking platform (like BookMyShow), built as a learning project. The goal is to see how the parts of a real system connect: frontend, backend, database, cache, message queue, containers and Kubernetes.

```
                        ┌─────────────────────────────────────────────────┐
  Browser               │  frontend (nginx)                               │
  React + TypeScript ──▶│   • serves the built React app                  │
                        │   • proxies /api/* ──────────┐                  │
                        └──────────────────────────────┼──────────────────┘
                                                       ▼
                        ┌─────────────────────────────────────────────────┐
                        │  backend (Spring Boot, :8080)                   │
                        │   controller → service → repository             │
                        └───┬───────────────┬────────────────┬────────────┘
                            │ JPA/SQL       │ cache + holds  │ publish "booking.confirmed"
                            ▼               ▼                ▼
                       ┌──────────┐   ┌──────────┐    ┌──────────┐      ┌──────────────────────┐
                       │ Postgres │   │  Redis   │    │  Kafka   │ ───▶ │ notifications service│
                       │ (truth)  │   │ (5-min   │    │ (log of  │      │ logs "TICKET SENT"   │
                       └──────────┘   │  locks)  │    │  events) │      └──────────────────────┘
                                      └──────────┘    └──────────┘
```

| Folder | What's in it |
|---|---|
| [`backend/`](backend) | Java 21 + Spring Boot 3.4 REST API (Web, Data JPA, Security, Redis, Kafka), Flyway migrations |
| [`notifications/`](notifications) | Small Spring Boot service that consumes Kafka events |
| [`ai-agent/`](ai-agent) | **Python AI agent**: LLM + tools + RAG over a Qdrant vector DB ([details](ai-agent/README.md)) |
| [`frontend/`](frontend) | React 18 + TypeScript + Vite single-page app, served by nginx in Docker |
| [`docker-compose.yml`](docker-compose.yml) | Runs all 8 containers together |
| [`infra/k8s/`](infra/k8s) | Kubernetes manifests + scripts for a local [kind](https://kind.sigs.k8s.io) cluster |

---

## Quick start

**Run everything with Docker (recommended):**

```bash
docker compose up --build -d
```

| URL | What |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:8080/api/events | The API directly |
| http://localhost:8080/actuator/health | Backend health |

Demo login: **`demo@bys.dev` / `demo1234`**, or sign up for a new account.

Watch the "emails" being sent:

```bash
docker compose logs -f notifications
```

Stop everything (add `-v` to also wipe the database):

```bash
docker compose down
```

> On this Mac, Docker runs through **Colima**, a lightweight Docker engine. After a reboot, start it again with `colima start` before using `docker`.

### Run the code locally while developing (hot reload)

Keep the infrastructure in Docker, and run the backend and frontend from source:

```bash
docker compose up -d postgres redis kafka notifications
```

```bash
cd backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw spring-boot:run
```

```bash
cd frontend && npm install && npm run dev
```

Then open http://localhost:5173. The Vite dev server proxies `/api` to `localhost:8080`, just like nginx does in Docker.

Postgres, Redis and Kafka are also installed natively through Homebrew (`brew services start postgresql@16` and so on). Use either those or the Docker containers, not both, because they use the same ports.

### Tests

```bash
cd backend && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw test
```

---

## How a request flows (frontend ↔ backend)

Take "show me my bookings" as an example:

1. **React** (`MyBookingsPage.tsx`) calls `bookingsApi.mine()`.
2. **`api/client.ts`** runs `fetch('/api/bookings/me', { headers: { Authorization: 'Bearer <jwt>' } })`.
3. **nginx** (or the Vite dev proxy) forwards `/api/...` to `backend:8080`.
4. **`JwtAuthFilter`** checks the token's signature and records "this is user 42".
5. **`SecurityConfig`** sees that `/api/bookings/**` requires login, and the request passes.
6. **`BookingController.mine()`** gets the user from the token and calls the service.
7. **`BookingService.myBookings()`** opens a DB transaction and calls the repository.
8. **`BookingRepository.findAllForUser()`** runs one SQL query with JOINs.
9. Entities are mapped to **DTOs**, Jackson turns them into **JSON**, and the response goes back.
10. React stores the JSON in state, and the page re-renders.

Errors take the same route in reverse. A service throws `ConflictException`, `GlobalExceptionHandler` turns it into `409 {"message": "..."}`, `client.ts` throws an `ApiError`, and the page shows the message.

### Why the backend is layered

| Layer | Package | Only job | Why separate it? |
|---|---|---|---|
| Controller | `controller/` | HTTP: URLs, JSON, status codes | Business rules don't depend on HTTP |
| Service | `service/` | Business rules and transactions | Reusable and unit-testable without a web server |
| Repository | `repository/` | Database access | You can swap or optimise queries without touching the rules |
| Entity | `entity/` | Java ↔ table mapping | The private storage shape |
| DTO | `dto/` | The public JSON shape | Never leaks `passwordHash`; the API stays stable when tables change |

---

## API reference

All routes are prefixed with `/api`. Request and response bodies are JSON. 🔒 means the route needs the header `Authorization: Bearer <token>`.

### Auth

| Method | Route | Body | Returns |
|---|---|---|---|
| POST | `/auth/signup` | `{email, password, fullName}` | `201 {token, user}` |
| POST | `/auth/login` | `{email, password}` | `200 {token, user}` (wrong credentials: `401`) |
| GET 🔒 | `/auth/me` | none | `{id, email, fullName}` |

### Events and shows (public)

| Method | Route | Returns |
|---|---|---|
| GET | `/events` | `[{id, title, category, language, durationMinutes, posterUrl}]` (cached in Redis) |
| GET | `/events/{id}` | Event details plus `shows: [{id, venueName, city, startTime}]` |
| GET | `/shows/{id}` | Show plus `seats: [{id, rowLabel, seatNumber, category, price, status}]`, where `status` is `AVAILABLE`, `HELD` or `BOOKED` |

### Bookings 🔒

| Method | Route | Body | What it does |
|---|---|---|---|
| POST | `/bookings` | `{showId, seatIds: [..]}` | Holds the seats for 5 minutes and returns a `PENDING` booking with `expiresAt` (`201`). Returns `409` if a seat is booked or held by someone else. |
| POST | `/bookings/{id}/confirm` | none | Simulated payment. The booking becomes `CONFIRMED`, the seats become `BOOKED`, and a Kafka event is published. Returns `409` if the hold expired. |
| DELETE | `/bookings/{id}` | none | Cancels a `PENDING` booking and releases its seats immediately |
| GET | `/bookings/me` | none | My bookings, newest first |
| GET | `/bookings/{id}` | none | One of my bookings (`404` if it isn't yours) |

### Error format (every error)

```json
{ "status": 409, "error": "Conflict", "message": "Already booked: A5", "timestamp": "...", "fieldErrors": {} }
```

### Try the full flow with curl

```bash
TOKEN=$(curl -s -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@bys.dev","password":"demo1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
```

```bash
curl -s -X POST localhost:8080/api/bookings -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"showId":1,"seatIds":[1,2]}'
```

```bash
curl -s -X POST localhost:8080/api/bookings/1/confirm -H "Authorization: Bearer $TOKEN"
```

---

## Data model

```
users ──1───*── bookings ──*───1── shows ──*───1── events
                   │                 │
                   *                 1
             booking_seats ──*───1── seats   (one row per seat per show; has a @Version column)
```

| Table | Key columns | Notes |
|---|---|---|
| `users` | `email` UNIQUE, `password_hash`, `full_name`, `role` | Passwords are BCrypt hashes |
| `events` | `title`, `description`, `category`, `language`, `duration_minutes`, `poster_url` | The "thing": a movie or a concert |
| `shows` | `event_id` FK, `venue_name`, `city`, `start_time` (TIMESTAMPTZ) | One occurrence of an event |
| `seats` | `show_id` FK, `row_label`, `seat_number`, `category`, `price` NUMERIC(10,2), `status`, `version` | UNIQUE(show, row, number) |
| `bookings` | `user_id` FK, `show_id` FK, `status`, `total_amount`, `created_at`, `expires_at` | `PENDING` → `CONFIRMED` / `CANCELLED` / `EXPIRED` |
| `booking_seats` | (`booking_id`, `seat_id`) PK | Join table for the many-to-many relationship |

Design notes:
- **The schema lives in Flyway migrations** ([`V1__schema.sql`](backend/src/main/resources/db/migration/V1__schema.sql) and [`V2__seed_data.sql`](backend/src/main/resources/db/migration/V2__seed_data.sql)). Hibernate only *validates* against it. Never edit a migration that has already run; add a `V3__...` instead.
- **Seats belong to a show, not a venue.** This is a simplification. Real systems use Venue → Screen → Seat, plus a per-show "ShowSeat" table.
- **Money is `NUMERIC`/`BigDecimal`, never floating point.**
- **The seed data creates shows relative to the day the database was first created.** After a few days they'll be in the past (booking still works). Run `docker compose down -v && docker compose up -d` to re-seed with fresh dates.

---

## Phase 4: Redis, and the "two people book the same seat" problem

**The problem.** Alice and Bob both open the 6pm show and both see seat A5 as free. Both click it and go to checkout. Payment takes a minute. Without protection, both pay, and one of them has a ticket for a seat that's already taken.

**Layer 1: a Redis hold, taken when checkout starts** ([`SeatHoldService`](backend/src/main/java/com/bys/service/SeatHoldService.java))

```
SET seat-hold:{showId}:{seatId} "booking:{id}" NX EX 300
```

- `NX` means "only set it if it does not exist". Redis runs one command at a time, so if Alice and Bob send this at the same instant, **exactly one wins**. Bob gets `409` immediately, before he enters any card details.
- `EX 300` means the key **deletes itself after 5 minutes**. If Alice abandons checkout, or our server crashes, the seat frees up automatically, and no cleanup job is needed.
- Releasing a hold uses a small Lua script that deletes the key only if it still holds *our* value. Otherwise we could delete someone else's hold after ours expired.
- The seat map merges both sources: `BOOKED` comes from Postgres and `HELD` comes from Redis.

**Layer 2: optimistic locking in Postgres, when payment confirms.** `seats.version` makes Hibernate run `UPDATE ... WHERE id=? AND version=?`. If anything slipped past Redis (for example, the hold expired and someone else grabbed the seat), the update matches 0 rows and we return `409`. **Postgres stays the source of truth.** Redis just makes the common case fast and friendly.

Verified: 10 users requesting the same seat at the same moment produced one `201` and nine `409`s.

**Caching.** `GET /api/events` is marked `@Cacheable`. The first call loads from Postgres and logs `Cache miss`. Later calls for 10 minutes come straight from Redis (`docker compose exec redis redis-cli GET events::all`). We use Redis rather than an in-memory map because several backend instances (see Kubernetes below) share one cache.

---

## Phase 5: Kafka, and why we use messaging instead of a direct call

When a booking is confirmed, the backend publishes a `booking.confirmed` event. The [notifications service](notifications/src/main/java/com/bys/notifications/BookingConfirmedListener.java) consumes it and logs `TICKET SENT`.

Why not just call `notificationService.sendTicket()` over HTTP?

| Direct call | Kafka |
|---|---|
| The user's "Pay" request waits for the email to send | The request returns immediately; the message is sent asynchronously |
| If notifications is down, the booking fails (or the email is lost) | Messages wait in Kafka; it catches up when it's back up |
| The backend must know about every downstream service | The backend just announces "this happened"; anyone can subscribe (analytics, loyalty points...) without changing booking code |
| One slow service slows everything | Each consumer works at its own pace |

Details worth knowing:
- **The event is published only after the DB transaction commits** (`@TransactionalEventListener(AFTER_COMMIT)`), so we never announce a booking that was rolled back. The remaining gap (a crash between commit and send) is solved in production with the *transactional outbox* pattern.
- **The message key is the `bookingId`.** It decides the partition, so events for one booking stay in order.
- **Services share a JSON contract, not Java classes.** Each service has its own `BookingConfirmedMessage` record. The consumer ignores unknown fields, so the producer can add fields safely.
- **Try it:** `docker compose stop notifications`, book a ticket, then `docker compose start notifications`. The "ticket" still arrives.

---

## Phase 6: Kubernetes (kind)

```bash
./infra/k8s/deploy.sh
```

This creates a kind cluster, builds and loads the images, and applies the manifests. The app is then at **http://localhost:8088**. Remove the cluster with:

```bash
./infra/k8s/teardown.sh
```

See [`infra/k8s/README.md`](infra/k8s/README.md) for a tour of the manifests and useful `kubectl` commands.

---

## Phase 7: AI booking agent (Python, RAG, vector DB)

A chat assistant (the **✨ Ask AI** button) that answers policy questions from our docs, finds events by meaning, checks live seat maps, and holds seats for you. It never pays: only you click Pay. It's built from:

- **FastAPI** (Python): the `ai-agent` service on :8000, reached through nginx at `/agent/*`
- **An LLM**: decides what to do, in a tool-calling loop
- **RAG:** help docs and events are embedded locally (fastembed) and stored in **Qdrant** (a vector database, dashboard at :6333)
- **Redis:** conversation memory

To enable the chat, put your LLM API key and model ID in `.env` (`cp .env.example .env`), then run `docker compose up -d ai-agent`. Full explanation: [ai-agent/README.md](ai-agent/README.md).

## What's deliberately left out (ideas for next steps)

- Real payments (Razorpay or Stripe test mode) instead of the simulated "Pay" button
- Admin endpoints to create events and shows (they would also need `@CacheEvict` on the events cache)
- Refresh tokens, and storing the JWT in an httpOnly cookie instead of localStorage
- A transactional outbox for guaranteed Kafka delivery
- Integration tests with Testcontainers (a real Postgres, Redis and Kafka in tests)
- Venue / Screen / ShowSeat modelling
