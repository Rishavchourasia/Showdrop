"""
INDEXING: the offline half of RAG. Runs at startup (and on POST /agent/reindex).

   documents ──chunk──▶ small pieces ──embed──▶ vectors ──store──▶ Qdrant

1. Knowledge docs (knowledge/*.md): split into chunks, one per section.
   WHY chunk? Retrieval should return the ONE relevant paragraph ("refund
   timing"), not a whole 2-page document. Smaller, focused chunks = more
   precise matches and fewer tokens sent to the LLM.
2. Events: fetched from the backend API, one point per event, with its shows
   embedded in the text so "comedy in Bengaluru" can match.
"""
import logging
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from . import backend_client, vector_store
from .config import settings

log = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")
MAX_CHUNK_CHARS = 1200


def chunk_markdown(text: str, source: str) -> list[dict]:
    """
    Split a markdown document at "## " headings. Each chunk keeps the document
    title + section heading, so it still makes sense on its own when retrieved
    ("Cancellations and refunds > Refund timing: ...").
    """
    title, chunks, heading, lines = source, [], None, []

    def flush():
        body = "\n".join(lines).strip()
        if not body:
            return
        label = f"{title} > {heading}" if heading else title
        # Very long sections are split further by paragraph so no chunk is huge.
        parts, current = [], ""
        for para in body.split("\n\n"):
            if current and len(current) + len(para) > MAX_CHUNK_CHARS:
                parts.append(current)
                current = ""
            current = f"{current}\n\n{para}".strip()
        parts.append(current)
        for p in parts:
            chunks.append({"section": label, "text": f"{label}\n{p}"})

    for line in text.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
        elif line.startswith("## "):
            flush()
            heading, lines = line[3:].strip(), []
        else:
            lines.append(line)
    flush()
    return [{**c, "source": source} for c in chunks]


def index_knowledge() -> int:
    vector_store.recreate_collection(vector_store.KNOWLEDGE)
    items = []
    for path in sorted(Path(settings.knowledge_dir).glob("*.md")):
        for i, chunk in enumerate(chunk_markdown(path.read_text(encoding="utf-8"), path.name)):
            items.append({
                "id": vector_store.point_id("knowledge", path.name, i),
                "text": chunk["text"],
                "payload": {"source": chunk["source"], "section": chunk["section"]},
            })
    return vector_store.upsert(vector_store.KNOWLEDGE, items)


def fmt_time(iso: str) -> str:
    """'2026-10-14T12:30:00Z' -> 'Wed 14 Oct 2026, 6:00 PM IST' (human-readable for the model and for search)."""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone(IST)
    return dt.strftime("%a %d %b %Y, %I:%M %p IST").replace(" 0", " ")


async def index_events() -> int:
    vector_store.recreate_collection(vector_store.EVENTS)
    items = []
    for summary in await backend_client.list_events():
        event = await backend_client.get_event(summary["id"])
        shows = [
            {"showId": s["id"], "venue": s["venueName"], "city": s["city"],
             "startTime": s["startTime"], "when": fmt_time(s["startTime"])}
            for s in event["shows"]
        ]
        show_lines = "\n".join(f"- Show {s['showId']}: {s['venue']}, {s['city']}, {s['when']}" for s in shows)
        text = (f"{event['title']} ({event['category']}, {event['language']}, {event['durationMinutes']} min)\n"
                f"{event['description']}\nShows:\n{show_lines}")
        items.append({
            "id": vector_store.point_id("event", event["id"]),
            "text": text,
            "payload": {
                "eventId": event["id"], "title": event["title"], "category": event["category"],
                "language": event["language"], "cities": sorted({s["city"] for s in shows}), "shows": shows,
            },
        })
    return vector_store.upsert(vector_store.EVENTS, items)


async def reindex_all() -> dict:
    counts = {"knowledge": index_knowledge(), "events": await index_events()}
    log.info("Indexed %s", counts)
    return counts
