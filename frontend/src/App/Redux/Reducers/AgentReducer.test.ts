import { describe, expect, it } from 'vitest';
import {
  AGENT_CHAT_RESET,
  AGENT_MESSAGE_SENT,
  AGENT_REPLY_FAILURE,
  AGENT_REPLY_SUCCESS,
} from '../Actions/AgentConstants';
import { agentReducer } from './AgentReducer';

describe('agent reducer (AI chat)', () => {
  it('adds the user message, then the reply with its tool calls and conversation id', () => {
    let s = agentReducer(undefined, { type: AGENT_MESSAGE_SENT, payload: { text: 'refunds?' } });
    expect(s).toMatchObject({ loading: true, messages: [{ role: 'user', text: 'refunds?' }] });

    s = agentReducer(s, {
      type: AGENT_REPLY_SUCCESS,
      payload: {
        conversationId: 'c1',
        reply: '5-7 days',
        toolCalls: [{ name: 'search_knowledge_base', input: {}, ok: true }],
        actions: [],
      },
    });
    expect(s.loading).toBe(false);
    expect(s.conversationId).toBe('c1');
    expect(s.messages[1]).toMatchObject({ role: 'assistant', text: '5-7 days' });
  });

  it('shows a failure as an error message inside the chat', () => {
    const s = agentReducer(undefined, {
      type: AGENT_REPLY_FAILURE,
      err: { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'not configured', fieldErrors: [] },
    });
    expect(s.messages.at(-1)).toMatchObject({ role: 'assistant', error: true });
  });

  it('"New chat" forgets the conversation', () => {
    const s = agentReducer(undefined, { type: AGENT_CHAT_RESET });
    expect(s).toEqual({ conversationId: null, messages: [], loading: false });
  });
});
