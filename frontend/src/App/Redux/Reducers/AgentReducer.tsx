import { AgentReply, ChatMessage } from '../../Models/Agent';
import { AppError } from '../../Models/HttpModels';
import { friendlyMessage } from '../../Utils/errors';
import { infoStore, StoredChat } from '../../Utils/InfoStore';
import { AppAction } from '../Actions/AppAction';
import {
  AGENT_CHAT_RESET,
  AGENT_CHAT_RESTORED,
  AGENT_MESSAGE_SENT,
  AGENT_REPLY_FAILURE,
  AGENT_REPLY_SUCCESS,
} from '../Actions/AgentConstants';

/* The AI chat. conversationId is how the Python agent finds the history it keeps in Redis. */
export interface AgentState {
  conversationId: string | null;
  messages: ChatMessage[];
  loading: boolean;
}

const initialState: AgentState = { ...infoStore.getChat(infoStore.getUser()?.id ?? null), loading: false };

export const agentReducer = (state = initialState, action: AppAction): AgentState => {
  switch (action.type) {
    case AGENT_MESSAGE_SENT: {
      const { text } = action.payload as { text: string };
      return { ...state, loading: true, messages: [...state.messages, { role: 'user', text }] };
    }
    case AGENT_REPLY_SUCCESS: {
      const res = action.payload as AgentReply;
      return {
        conversationId: res.conversationId,
        loading: false,
        messages: [
          ...state.messages,
          { role: 'assistant', text: res.reply, toolCalls: res.toolCalls, actions: res.actions },
        ],
      };
    }
    case AGENT_REPLY_FAILURE:
      return {
        ...state,
        loading: false,
        messages: [
          ...state.messages,
          { role: 'assistant', text: friendlyMessage(action.err as AppError), error: true },
        ],
      };
    case AGENT_CHAT_RESET:
      return { conversationId: null, messages: [], loading: false };
    case AGENT_CHAT_RESTORED:
      return { ...(action.payload as StoredChat), loading: false };
    default:
      return state;
  }
};
