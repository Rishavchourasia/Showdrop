# AI booking agent (Python · LLM · RAG · Qdrant)

A chat assistant that can answer policy questions, find events, check live seat maps, and **hold** seats for the logged-in user. It cannot pay: only the user can click Pay.

```
React chat widget ──POST /agent/chat (+ user's JWT)──▶ ai-agent (FastAPI, :8000)
                                                         │
                                       ┌─────────────────┼──────────────────┬─────────────────┐
                                       ▼                 ▼                  ▼                 ▼
                                  LLM API          Qdrant (vectors)   Java backend API   Redis (chat memory)
                                  (decides)        (RAG retrieval)    (tools act here)
```

## Setup: add your LLM API key and model

1. Get an API key and a model ID from your LLM provider.
2. In the **project root** (`bys/`), copy the example file and set `LLM_API_KEY` and `AGENT_MODEL` in it:
   ```bash
   cp .env.example .env
   ```
   `.env` is git-ignored, so the key never gets committed.
3. Restart the agent:
   ```bash
   docker compose up -d ai-agent
   ```

Without a key, everything else still works (search, health, the rest of the app), and the chat replies "not configured".

| URL | What |
|---|---|
| http://localhost:3000 → **✨ Ask AI** (bottom right) | The chat widget |
| http://localhost:8000/docs | Auto-generated API docs (FastAPI) |
| http://localhost:6333/dashboard | Qdrant dashboard: browse the stored vectors |
| `curl "localhost:8000/agent/search?q=refund"` | See what RAG retrieves (free, no LLM call) |

## The three ideas

### 1. RAG (Retrieval-Augmented Generation)

LLMs don't know *our* refund policy or *today's* shows. RAG fetches the relevant facts and hands them to the model, so it answers from real data instead of guessing.

**Indexing**, at startup (see [`app/ingest.py`](app/ingest.py)):

```
knowledge/*.md ──split by section──▶ 24 chunks ─┐
backend /api/events ──one per event──▶ 4 docs ──┼──embed (bge-small, local)──▶ vectors ──▶ Qdrant
```

**Retrieval**, when the LLM calls a search tool:

```
"can I get my money back?" ──embed──▶ [0.12, -0.03, ...] ──nearest neighbours──▶ "Refunds > Refund timing"
```

Matching is by **meaning**, not keywords. "money back" finds the *refund* section, and "astronauts" finds *Starfall*, with no shared words. Try it at `/agent/search`.

- **Embeddings:** [`app/embeddings.py`](app/embeddings.py). fastembed with `BAAI/bge-small-en-v1.5` runs on your CPU, so it's free and needs no key. It produces 384 numbers per text.
- **Vector database:** [`app/vector_store.py`](app/vector_store.py). Qdrant stores the vectors and finds the nearest ones (cosine similarity). It can also filter on metadata, e.g. `cities = "Mumbai"`.

### 2. Tools (what the agent can *do*)

[`app/tools.py`](app/tools.py) defines five tools. The LLM can't run code; it asks *us* to run a tool, and we send back the result.

| Tool | Does | Calls |
|---|---|---|
| `search_knowledge_base` | RAG over help docs | Qdrant |
| `search_events` | Semantic event search, optional city/category filter | Qdrant |
| `get_show_seats` | Live seat map | `GET /api/shows/{id}` |
| `hold_seats` | 5-minute hold, PENDING booking | `POST /api/bookings` with the **user's JWT** |
| `get_my_bookings` | User's bookings | `GET /api/bookings/me` with the user's JWT |

**Safety by design:**
- **There is no pay tool.** Holding seats is reversible (it expires in 5 minutes); paying needs the human click.
- **The agent calls the same API as the website,** with the same permissions as the user. It can't bypass seat locks or see other people's bookings.
- **Inputs are validated twice:** `strict: true` on the API side, then Pydantic on ours.
- **Tool errors are returned to the LLM as results, not crashes.** If a seat was just taken (409), the LLM reads that and offers alternatives.

### 3. The agent loop

[`app/agent.py`](app/agent.py). An agent is an LLM in a loop:

```
messages = history + new user message
loop (max 8 steps):
    response = LLM(messages, tools)
    if it answered in text     → done
    if it asked for tools      → run them (in parallel) → append results → loop again
save messages to Redis
```

Example of a single user turn: *"2 seats together for Starfall in Mumbai"*. The LLM calls `search_events` → `get_show_seats` → replies "D5 and D6, Rs. 200 each. Shall I hold them?". The user says "yes", and the LLM calls `hold_seats`. The widget then shows a **Pay** button linking to the checkout page.

Other details:
- **Memory:** the LLM is stateless, so we store the full conversation in Redis (`agent:conv:<id>`, 1-hour TTL) and send it back each turn, append-only.
- **Model:** set with the `AGENT_MODEL` env var (adaptive thinking at `medium` effort, change with `AGENT_EFFORT`).
- **Prompt caching:** the tools and system prompt never change, so repeated calls reuse the cache. The `cache_read_tokens` figure in each reply shows the savings.
- **Refusal fallback:** if a safety classifier declines, the API retries on a recommended fallback model (`fallbacks: "default"`).

## Run it without Docker (for development)

From `ai-agent/`, with Qdrant, Redis and the backend running in Docker:

```bash
uv sync
```

```bash
uv run uvicorn app.main:app --reload --port 8000
```

```bash
uv run pytest
```

The tests cover chunking and the agent loop, using a fake LLM, so they need no key and cost nothing.

## Cost

Each chat turn makes 1–4 LLM API calls (one per loop step). The reply's `usage` field shows the tokens used. Embeddings and vector search are local and free.
