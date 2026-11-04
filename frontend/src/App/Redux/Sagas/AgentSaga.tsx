import { all, call, put, select, takeEvery, takeLeading } from 'redux-saga/effects';
import { AgentReply } from '../../Models/Agent';
import { AppError } from '../../Models/HttpModels';
import { AgentService } from '../../Services/AgentService';
import { infoStore } from '../../Utils/InfoStore';
import { callApiHandled } from '../../Utils/sagaHelpers';
import type { RootState } from '../Reducers/reducers';
import { AppAction } from '../Actions/AppAction';
import {
  AGENT_CHAT_RESET,
  AGENT_MESSAGE_SENT,
  AGENT_REPLY_FAILURE,
  AGENT_REPLY_SUCCESS,
} from '../Actions/AgentConstants';

/*
 * Send a chat message to the Python AI agent. One agent turn can take several
 * seconds (LLM + tools). takeLeading ignores extra sends while one is in flight.
 * Errors (e.g. "not configured") are shown INSIDE the chat, not as a global modal.
 */
export function* sendMessageSaga({ payload }: AppAction) {
  const { text } = payload as { text: string };
  const conversationId: string | null = yield select((state: RootState) => state.agent.conversationId);
  try {
    const reply: AgentReply = yield* callApiHandled(AgentService.chat, text, conversationId);
    yield put({ type: AGENT_REPLY_SUCCESS, payload: reply, error: false, err: null });
  } catch (error) {
    yield put({ type: AGENT_REPLY_FAILURE, payload: null, error: true, err: error as AppError });
  }
}

/** Remember the chat for this tab, per user, so it survives page changes. */
function* persistChatSaga() {
  const { agent, auth }: RootState = yield select((state: RootState) => state);
  yield call([infoStore, infoStore.saveChat], auth.user?.id ?? null, {
    conversationId: agent.conversationId,
    messages: agent.messages,
  });
}

export default function* agentSaga() {
  yield all([
    takeLeading(AGENT_MESSAGE_SENT, sendMessageSaga),
    takeEvery([AGENT_REPLY_SUCCESS, AGENT_REPLY_FAILURE, AGENT_CHAT_RESET], persistChatSaga),
  ]);
}
