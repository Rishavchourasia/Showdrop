"""
THE AGENT LOOP -- the heart of this service.

An "agent" is just an LLM in a loop with tools:

    user message
        │
        ▼
    ┌─► the LLM ── answers in text? ───► done, reply to the user
    │     │
    │     └── asks to call tool(s)
    │             │
    │             ▼
    │     our code runs the tool(s)  (search Qdrant, call the Java API, ...)
    │             │
    └──── send the results back to the LLM

The LLM decides WHAT to do; our code decides WHAT IS ALLOWED (the tool list)
and actually DOES it. We write this loop by hand (instead of using the SDK's
tool runner helper) so every step is visible, and so we can save the exact
conversation to Redis after each turn.

RAG happens inside this loop: when the LLM calls search_knowledge_base or
search_events, the retrieved text is fed back to it as a tool result, and it
answers grounded in that text ("Retrieval-Augmented Generation").
"""
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from zoneinfo import ZoneInfo

import anthropic
from anthropic import AsyncAnthropic

from . import memory
from .config import settings
from .tools import TOOL_DEFINITIONS, run_tool

log = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")

# The system prompt sets the agent's role and rules. It never changes between
# requests, so it can be cached by the API (cheaper and faster on every turn).
SYSTEM_PROMPT = """You are the booking assistant for Showdrop, a ticket booking site for movies, concerts, comedy and theatre in Mumbai, Bengaluru and Delhi.

You help users find events, understand policies, pick seats, and hold seats so they can pay.

How to work:
- For questions about policies, prices, refunds, seat holds, venues or accounts, use search_knowledge_base and answer from what it returns. If the documents don't cover it, say you don't know rather than guessing.
- For finding something to watch, use search_events. Show times come from the tools; never invent shows, venues, prices or seats.
- Before suggesting seats, check the live seat map with get_show_seats. Recommend specific seats (e.g. "D5 and D6, together in the middle, Rs. 200 each").
- Only call hold_seats after the user has clearly agreed to the specific show and seats. Holding is not paying: afterwards tell them the seats are held for 5 minutes and that they need to click the payment button to pay. You cannot take payment yourself.
- If a tool says the user isn't logged in, ask them to log in using the button at the top right.
- If seats were just taken by someone else, explain and offer the nearest alternatives.

Style: friendly, concise, plain text with short lists where helpful. Prices are in Indian rupees (Rs.). Times are in India Standard Time."""

_client: AsyncAnthropic | None = None


def client() -> AsyncAnthropic:
    global _client
    if _client is None:
        # The key comes from the environment or the .env file -- never hard-code keys.
        # (None lets the SDK fall back to its own credential lookup.)
        _client = AsyncAnthropic(api_key=settings.llm_api_key)
    return _client


@dataclass
class ToolCall:
    name: str
    input: dict
    ok: bool


@dataclass
class AgentReply:
    conversation_id: str
    reply: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    actions: list[dict] = field(default_factory=list)
    usage: dict = field(default_factory=lambda: {"input_tokens": 0, "output_tokens": 0, "cache_read_tokens": 0})


class AgentUnavailable(Exception):
    """The LLM can't be reached / isn't configured. Shown to the user as a friendly message."""


def _to_history(content) -> list[dict]:
    """
    Convert the response's content blocks to plain dicts for storage/replay.
    If the server switched to a fallback model mid-answer (a `fallback` block),
    blocks produced BEFORE the switch (other than plain text) must not be sent
    back -- they belong to the declined attempt.
    """
    blocks = [b.model_dump(mode="json", by_alias=True, exclude_none=True) for b in content]
    last_fallback = max((i for i, b in enumerate(blocks) if b["type"] == "fallback"), default=-1)
    return [b for i, b in enumerate(blocks) if i >= last_fallback or b["type"] == "text"]


def _append_user(messages: list[dict], blocks: list[dict]) -> None:
    """Add user content. If the last message is already a user turn (e.g. tool results), extend it."""
    if messages and messages[-1]["role"] == "user":
        messages[-1]["content"].extend(blocks)
    else:
        messages.append({"role": "user", "content": blocks})


def is_configured() -> bool:
    """Do we have an API key and a model ID? (from .env / environment)"""
    return bool(settings.llm_api_key and settings.agent_model)


async def chat(conversation_id: str | None, user_text: str, jwt: str | None, user_name: str | None) -> AgentReply:
    if not is_configured():
        raise AgentUnavailable(
            "The AI assistant isn't configured yet: add LLM_API_KEY and AGENT_MODEL to the .env file and restart the ai-agent service.")
    conversation_id = conversation_id or memory.new_conversation_id()
    messages = await memory.load(conversation_id)
    out = AgentReply(conversation_id=conversation_id, reply="")

    # Context that changes every turn goes in the USER message, not the system prompt,
    # so the system prompt stays identical and cacheable.
    now = datetime.now(IST).strftime("%A %d %B %Y, %I:%M %p IST")
    who = f"logged in as {user_name}" if jwt else "not logged in"
    _append_user(messages, [
        {"type": "text", "text": f"<context>Current time: {now}. The user is {who}.</context>"},
        {"type": "text", "text": user_text},
    ])

    for step in range(settings.agent_max_steps):
        try:
            response = await client().beta.messages.create(
                model=settings.agent_model,
                max_tokens=16000,
                system=SYSTEM_PROMPT,
                tools=TOOL_DEFINITIONS,
                messages=messages,
                # Adaptive thinking: the model decides how much to reason before acting.
                thinking={"type": "adaptive"},
                output_config={"effort": settings.agent_effort},
                # Cache the stable prefix (tools + system prompt + earlier turns) between calls.
                cache_control={"type": "ephemeral"},
                # If a safety classifier declines, retry server-side on a recommended fallback model.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except (anthropic.AuthenticationError, anthropic.PermissionDeniedError, anthropic.CredentialsError) as e:
            raise AgentUnavailable("The AI assistant isn't configured: set a valid LLM_API_KEY.") from e
        except anthropic.RateLimitError as e:
            raise AgentUnavailable("The AI assistant is busy right now. Please try again in a moment.") from e
        except anthropic.APIConnectionError as e:
            raise AgentUnavailable("Can't reach the AI service right now.") from e
        except anthropic.APIStatusError as e:
            log.error("LLM API error %s: %s", e.status_code, e.message)
            raise AgentUnavailable("The AI assistant hit an error. Please try again.") from e

        u = response.usage
        out.usage["input_tokens"] += u.input_tokens
        out.usage["output_tokens"] += u.output_tokens
        out.usage["cache_read_tokens"] += u.cache_read_input_tokens or 0

        messages.append({"role": "assistant", "content": _to_history(response.content)})
        text = "\n".join(b.text for b in response.content if b.type == "text").strip()

        if response.stop_reason == "refusal":
            out.reply = "Sorry, I can't help with that request."
            break

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if response.stop_reason != "tool_use" or not tool_uses:
            out.reply = text or "(no answer)"
            break

        # The model may ask for several tools at once: run them in parallel, then send
        # ALL results back together in one user message.
        log.info("step %d: the model calls %s", step, [(t.name, t.input) for t in tool_uses])
        outcomes = await asyncio.gather(*(run_tool(t.name, t.input, jwt) for t in tool_uses))
        results = []
        for t, o in zip(tool_uses, outcomes):
            out.tool_calls.append(ToolCall(name=t.name, input=t.input, ok=not o.is_error))
            if o.action:
                out.actions.append(o.action)
            results.append({"type": "tool_result", "tool_use_id": t.id, "content": o.content, "is_error": o.is_error})
        messages.append({"role": "user", "content": results})
    else:
        out.reply = "Sorry, that took too many steps. Could you rephrase or narrow down your request?"

    await memory.save(conversation_id, messages)
    log.info("conversation %s: %d tool calls, usage %s", conversation_id, len(out.tool_calls), out.usage)
    return out
