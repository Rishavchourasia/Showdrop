"""
The HTTP API of the AI agent service (FastAPI).

    POST /agent/chat       talk to the agent              (the React chat widget uses this)
    GET  /agent/search     see raw RAG retrieval results  (for learning/debugging, no LLM involved)
    POST /agent/reindex    rebuild the vector database
    GET  /agent/health     is everything up?

WHY a separate Python service instead of adding this to the Java backend?
Python has the richest AI/ML ecosystem (embeddings, vector DB clients), and
keeping it separate means the AI part can be scaled, deployed or rewritten
without touching the booking system -- the same microservice idea as the
notifications service.

Interactive API docs are generated automatically: http://localhost:8000/docs
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from dataclasses import asdict
from typing import Literal

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from . import agent, backend_client, ingest, memory, vector_store
from .backend_client import BackendError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ai-agent")


async def _index_when_backend_ready():
    """The backend may still be starting (Flyway, etc.), so retry indexing for a while."""
    for attempt in range(30):
        try:
            await ingest.reindex_all()
            return
        except Exception as e:
            log.info("Indexing not possible yet (attempt %d): %s", attempt + 1, e)
            await asyncio.sleep(5)
    log.error("Gave up indexing; call POST /agent/reindex once the backend is up")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once at startup. Index in the background so the server starts immediately.
    task = asyncio.create_task(_index_when_backend_ready())
    yield
    task.cancel()


app = FastAPI(title="Showdrop AI agent", lifespan=lifespan)


class CamelModel(BaseModel):
    """Accept/return camelCase JSON (conversationId) like the Java API, while using snake_case in Python."""
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ChatRequest(CamelModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None


class ChatResponse(CamelModel):
    conversation_id: str
    reply: str
    tool_calls: list[dict]
    actions: list[dict]
    usage: dict


async def _current_user(authorization: str | None) -> tuple[str | None, str | None]:
    """Forward the user's JWT to the backend to find out who they are (and whether the token is valid)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None, None
    jwt = authorization[7:]
    try:
        me = await backend_client._request("GET", "/auth/me", jwt)
        return jwt, me["fullName"]
    except BackendError:
        return None, None  # expired/invalid token: treat as logged out


@app.post("/agent/chat", response_model=ChatResponse, response_model_by_alias=True)
async def chat(body: ChatRequest, authorization: str | None = Header(default=None)):
    jwt, name = await _current_user(authorization)
    try:
        result = await agent.chat(body.conversation_id, body.message, jwt, name)
    except agent.AgentUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    data = asdict(result)
    return ChatResponse(**data)


@app.get("/agent/search")
async def search(q: str, collection: Literal["knowledge", "events"] = "knowledge", limit: int = 4):
    """Peek inside RAG: what would the agent retrieve for this query? (No LLM call, free to use.)"""
    hits = vector_store.search(collection, q, min(limit, 10))
    return {"query": q, "collection": collection, "results": hits}


@app.post("/agent/reindex")
async def reindex():
    return await ingest.reindex_all()


@app.get("/agent/health")
async def health():
    try:
        counts = {"knowledge": vector_store.count(vector_store.KNOWLEDGE),
                  "events": vector_store.count(vector_store.EVENTS)}
        qdrant = True
    except Exception:
        counts, qdrant = {}, False
    return {"status": "UP", "qdrant": qdrant, "redis": await memory.ping(), "indexed": counts,
            "llmConfigured": agent.is_configured()}
