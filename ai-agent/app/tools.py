"""
TOOLS: the actions the agent is allowed to take.

How tool use works:
  1. We send the LLM a list of tool DEFINITIONS (name + description + JSON schema).
  2. The LLM can't run code. Instead it replies "please call search_events with
     {query: 'comedy', city: 'Bengaluru'}" (a `tool_use` block).
  3. OUR code runs the function and sends the result back (a `tool_result` block).
  4. The LLM reads the result and either calls another tool or answers.

The descriptions matter a lot: they're how the LLM decides WHICH tool to use and when.

SAFETY BY DESIGN: there is deliberately NO "pay" / "confirm" tool. The agent can
search and HOLD seats (reversible: a hold expires in 5 minutes), but only a human
clicking Pay on the checkout page can spend money.
"""
import json
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from . import backend_client, vector_store
from .backend_client import BackendError
from .config import settings
from .ingest import fmt_time

NULLABLE_STRING = {"anyOf": [{"type": "string"}, {"type": "null"}]}

# `strict: True` makes the API guarantee the model's arguments match the schema exactly.
# Strict schemas need additionalProperties: false and every property listed in
# `required` -- "optional" fields are expressed as nullable instead.
TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "search_knowledge_base",
        "description": (
            "Search Showdrop's help documents: how booking works, the 5-minute seat hold, seat categories "
            "and prices, cancellations and refunds, venue rules, account and support. Use this for ANY policy "
            "or how-to question, and answer only from what it returns."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "The question, in natural language."}},
            "required": ["query"],
            "additionalProperties": False,
        },
    },
    {
        "name": "search_events",
        "description": (
            "Find events (movies, concerts, comedy, theatre) by meaning, e.g. 'space movie' or 'something funny'. "
            "Returns matching events with all their shows (show id, venue, city, date/time). "
            "Optionally filter by exact city (Mumbai, Bengaluru, Delhi) and/or category (Movie, Concert, Comedy, Theatre)."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What the user is looking for."},
                "city": {**NULLABLE_STRING, "description": "Exact city name, or null for any city."},
                "category": {**NULLABLE_STRING, "description": "Movie, Concert, Comedy or Theatre, or null."},
            },
            "required": ["query", "city", "category"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_show_seats",
        "description": (
            "Get the live seat map for one show: every row with its category, price, and which seats are "
            "available (with their seat ids). Seats with consecutive numbers in the same row are next to each "
            "other; 5 and 6 are split by the aisle. Always call this before suggesting or holding seats."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"show_id": {"type": "integer"}},
            "required": ["show_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "hold_seats",
        "description": (
            "Hold specific seats for the logged-in user for 5 minutes and create a PENDING booking. "
            "ONLY call this after the user has explicitly agreed to the exact show and seats. "
            "It does NOT take payment: the user must open the checkout link and click Pay themselves."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "show_id": {"type": "integer"},
                "seat_ids": {"type": "array", "items": {"type": "integer"},
                             "description": "Seat ids from get_show_seats (1 to 10 seats)."},
            },
            "required": ["show_id", "seat_ids"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_my_bookings",
        "description": "List the logged-in user's bookings (newest first) with status, seats and amount.",
        "strict": True,
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    },
]


# Pydantic models re-validate inputs on our side before running anything
# (never trust input blindly, even from the model).
class KnowledgeInput(BaseModel):
    query: str = Field(min_length=1)


class SearchEventsInput(BaseModel):
    query: str = Field(min_length=1)
    city: str | None = None
    category: str | None = None


class ShowInput(BaseModel):
    show_id: int


class HoldInput(BaseModel):
    show_id: int
    seat_ids: list[int] = Field(min_length=1, max_length=10)


class NoInput(BaseModel):
    pass


@dataclass
class ToolOutcome:
    content: str                       # what goes back to the LLM (JSON text)
    is_error: bool = False
    action: dict | None = None         # something for the UI, e.g. a "Go to checkout" button
    meta: dict[str, Any] = field(default_factory=dict)


def _ok(data: Any, action: dict | None = None) -> ToolOutcome:
    return ToolOutcome(json.dumps(data, ensure_ascii=False), action=action)


def _err(message: str) -> ToolOutcome:
    return ToolOutcome(json.dumps({"error": message}), is_error=True)


async def _search_knowledge(i: KnowledgeInput, jwt: str | None) -> ToolOutcome:
    hits = vector_store.search(vector_store.KNOWLEDGE, i.query, settings.rag_top_k)
    return _ok({"results": [{"source": h["source"], "section": h["section"], "score": h["score"], "text": h["text"]}
                            for h in hits]})


async def _search_events(i: SearchEventsInput, jwt: str | None) -> ToolOutcome:
    must = {}
    if i.city:
        must["cities"] = i.city.strip().title()
    if i.category:
        must["category"] = i.category.strip().title()
    hits = vector_store.search(vector_store.EVENTS, i.query, 4, must or None)
    return _ok({"events": [
        {"eventId": h["eventId"], "title": h["title"], "category": h["category"], "language": h["language"],
         "score": h["score"],
         "shows": [s for s in h["shows"] if not i.city or s["city"] == must["cities"]]}
        for h in hits
    ]})


async def _get_show_seats(i: ShowInput, jwt: str | None) -> ToolOutcome:
    show = await backend_client.get_show(i.show_id)
    rows: dict[str, dict] = {}
    for s in show["seats"]:
        row = rows.setdefault(s["rowLabel"], {"row": s["rowLabel"], "category": s["category"],
                                              "price": s["price"], "available": [], "taken": []})
        label = f"{s['rowLabel']}{s['seatNumber']}"
        if s["status"] == "AVAILABLE":
            row["available"].append({"seat": label, "id": s["id"]})
        else:
            row["taken"].append(label)
    return _ok({
        "showId": show["id"], "event": show["event"]["title"], "venue": show["venueName"], "city": show["city"],
        "when": fmt_time(show["startTime"]), "holdMinutes": show["holdMinutes"],
        "rows": list(rows.values()),
    })


async def _hold_seats(i: HoldInput, jwt: str | None) -> ToolOutcome:
    if not jwt:
        return _err("The user is not logged in. Ask them to log in (top right) and then try again.")
    booking = await backend_client.create_booking(jwt, i.show_id, i.seat_ids)
    url = f"/checkout/{booking['id']}"
    return _ok(
        {"bookingId": booking["id"], "status": booking["status"], "totalAmount": booking["totalAmount"],
         "seats": [f"{s['rowLabel']}{s['seatNumber']}" for s in booking["seats"]],
         "expiresAt": booking["expiresAt"], "checkoutUrl": url,
         "note": "Seats are held, NOT paid. The user must open the checkout link and click Pay within 5 minutes."},
        action={"type": "checkout", "bookingId": booking["id"], "url": url,
                "label": f"Pay Rs. {booking['totalAmount']:.0f} for {', '.join(f'{s['rowLabel']}{s['seatNumber']}' for s in booking['seats'])}"},
    )


async def _get_my_bookings(i: NoInput, jwt: str | None) -> ToolOutcome:
    if not jwt:
        return _err("The user is not logged in. Ask them to log in to see their bookings.")
    bookings = await backend_client.my_bookings(jwt)
    return _ok({"bookings": [
        {"bookingId": b["id"], "status": b["status"], "event": b["eventTitle"],
         "venue": f"{b['show']['venueName']}, {b['show']['city']}", "when": fmt_time(b["show"]["startTime"]),
         "seats": [f"{s['rowLabel']}{s['seatNumber']}" for s in b["seats"]], "totalAmount": b["totalAmount"]}
        for b in bookings[:10]
    ]})


_REGISTRY = {
    "search_knowledge_base": (KnowledgeInput, _search_knowledge),
    "search_events": (SearchEventsInput, _search_events),
    "get_show_seats": (ShowInput, _get_show_seats),
    "hold_seats": (HoldInput, _hold_seats),
    "get_my_bookings": (NoInput, _get_my_bookings),
}


async def run_tool(name: str, raw_input: Any, jwt: str | None) -> ToolOutcome:
    """Validate the input, run the tool, and turn any failure into an error RESULT (never a crash):
    The LLM reads the error and can recover, e.g. pick other seats after a 409."""
    if name not in _REGISTRY:
        return _err(f"Unknown tool {name}")
    model, fn = _REGISTRY[name]
    try:
        parsed = model.model_validate(raw_input or {})
    except ValidationError as e:
        return _err(f"Invalid input: {e.errors(include_url=False)}")
    try:
        return await fn(parsed, jwt)
    except BackendError as e:
        if e.status == 401:
            return _err("The user's login has expired or they are not logged in. Ask them to log in again.")
        return _err(f"{e.message} (HTTP {e.status})")
    except Exception as e:  # e.g. vector DB down
        return _err(f"Tool failed: {e}")
