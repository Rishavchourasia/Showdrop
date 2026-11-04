"""
CONVERSATION MEMORY in Redis.

The LLM itself is STATELESS: every API call must include the whole conversation
so far. We store each conversation's message list in Redis under
"agent:conv:<id>" with a 1-hour expiry (the same auto-expire trick as seat holds).

WHY store the FULL messages (including tool calls and the model's thinking blocks)
instead of just the chat text? The API expects the history to be sent back
exactly as it was produced -- append-only, never edited. Keeping the raw blocks
lets the model continue its reasoning correctly on the next turn.

WHY Redis and not a Python dict? With 2+ agent replicas (Kubernetes), the next
message from the same user may hit a different replica. Redis is shared.
"""
import json
import uuid

import redis.asyncio as redis

from .config import settings

_redis = redis.Redis(host=settings.redis_host, port=settings.redis_port, decode_responses=True)


def new_conversation_id() -> str:
    return uuid.uuid4().hex


def _key(conversation_id: str) -> str:
    return f"agent:conv:{conversation_id}"


async def load(conversation_id: str) -> list[dict]:
    raw = await _redis.get(_key(conversation_id))
    return json.loads(raw) if raw else []


async def save(conversation_id: str, messages: list[dict]) -> None:
    await _redis.set(_key(conversation_id), json.dumps(messages), ex=settings.conversation_ttl)


async def ping() -> bool:
    try:
        return bool(await _redis.ping())
    except redis.RedisError:
        return False
