"""
Tests the agent LOOP without calling the real LLM API (no key, no cost):
a fake client returns scripted responses, so we can check that tool calls are
executed, results are sent back, and the final text is returned.
"""
import asyncio
import copy
from types import SimpleNamespace

import pytest

from anthropic.types.beta import BetaTextBlock, BetaToolUseBlock

from app import agent, memory
from app.tools import ToolOutcome


def response(content, stop_reason):
    usage = SimpleNamespace(input_tokens=10, output_tokens=5, cache_read_input_tokens=0)
    return SimpleNamespace(content=content, stop_reason=stop_reason, usage=usage)


class FakeMessages:
    def __init__(self, scripted):
        self.scripted = scripted
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(copy.deepcopy(kwargs))  # snapshot: the loop keeps appending to the same list
        return self.scripted.pop(0)


def run(coro):
    return asyncio.run(coro)


@pytest.fixture(autouse=True)
def fake_api_key(monkeypatch):
    monkeypatch.setattr(agent.settings, "llm_api_key", "test-key")
    monkeypatch.setattr(agent.settings, "agent_model", "test-model")


def test_tool_call_then_answer(monkeypatch):
    fake = FakeMessages([
        response([BetaToolUseBlock(id="t1", name="search_knowledge_base", input={"query": "refund"}, type="tool_use")],
                 "tool_use"),
        response([BetaTextBlock(text="Refunds take 5-7 days.", type="text")], "end_turn"),
    ])
    monkeypatch.setattr(agent, "_client", SimpleNamespace(beta=SimpleNamespace(messages=fake)))

    executed = []

    async def fake_tool(name, raw, jwt):
        executed.append((name, raw, jwt))
        return ToolOutcome('{"results": ["Refunds take 5 to 7 working days."]}')

    saved = {}

    async def fake_load(cid):
        return []

    async def fake_save(cid, messages):
        saved[cid] = messages

    monkeypatch.setattr(agent, "run_tool", fake_tool)
    monkeypatch.setattr(memory, "load", fake_load)
    monkeypatch.setattr(memory, "save", fake_save)

    reply = run(agent.chat(None, "How long do refunds take?", jwt="token-123", user_name="Demo"))

    assert reply.reply == "Refunds take 5-7 days."
    assert executed == [("search_knowledge_base", {"query": "refund"}, "token-123")]
    assert [t.name for t in reply.tool_calls] == ["search_knowledge_base"]
    # 2nd API call must contain: user msg, assistant tool_use, user tool_result
    second = fake.calls[1]["messages"]
    assert [m["role"] for m in second] == ["user", "assistant", "user"]
    assert second[2]["content"][0]["type"] == "tool_result"
    assert second[2]["content"][0]["tool_use_id"] == "t1"
    # Whole conversation (including the final answer) is saved for the next turn.
    history = saved[reply.conversation_id]
    assert history[-1]["role"] == "assistant"
    assert reply.usage["input_tokens"] == 20


def test_actions_surface_for_checkout(monkeypatch):
    fake = FakeMessages([
        response([BetaToolUseBlock(id="t1", name="hold_seats", input={"show_id": 1, "seat_ids": [4, 5]},
                                   type="tool_use")], "tool_use"),
        response([BetaTextBlock(text="Held! Click the button to pay.", type="text")], "end_turn"),
    ])
    monkeypatch.setattr(agent, "_client", SimpleNamespace(beta=SimpleNamespace(messages=fake)))

    async def fake_tool(name, raw, jwt):
        return ToolOutcome("{}", action={"type": "checkout", "url": "/checkout/7"})

    async def noop_load(cid):
        return []

    async def noop_save(cid, m):
        pass

    monkeypatch.setattr(agent, "run_tool", fake_tool)
    monkeypatch.setattr(memory, "load", noop_load)
    monkeypatch.setattr(memory, "save", noop_save)

    reply = run(agent.chat(None, "Book A4 and A5", jwt="t", user_name="Demo"))
    assert reply.actions == [{"type": "checkout", "url": "/checkout/7"}]


def test_fallback_drops_blocks_from_declined_attempt():
    blocks = [
        SimpleNamespace(model_dump=lambda **k: {"type": "thinking", "thinking": "", "signature": "s"}),
        SimpleNamespace(model_dump=lambda **k: {"type": "text", "text": "partial"}),
        SimpleNamespace(model_dump=lambda **k: {"type": "fallback"}),
        SimpleNamespace(model_dump=lambda **k: {"type": "text", "text": "answer"}),
    ]
    assert [b["type"] for b in agent._to_history(blocks)] == ["text", "fallback", "text"]


def test_without_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(agent.settings, "llm_api_key", "")
    with pytest.raises(agent.AgentUnavailable):
        run(agent.chat(None, "hi", jwt=None, user_name=None))
