// Shapes of the Python AI agent's POST /agent/chat response.
export interface AgentToolCall {
  name: string;
  input: Record<string, unknown>;
  ok: boolean;
}

export interface AgentAction {
  type: 'checkout';
  bookingId: number;
  url: string;
  label: string;
}

export interface AgentReply {
  conversationId: string;
  reply: string;
  toolCalls: AgentToolCall[];
  actions: AgentAction[];
  usage: { input_tokens: number; output_tokens: number; cache_read_tokens: number };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  toolCalls?: AgentToolCall[];
  actions?: AgentAction[];
  error?: boolean;
}
