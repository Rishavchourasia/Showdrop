import { agentApiUrl } from '../Constants/urlConstants';
import { AgentReply } from '../Models/Agent';
import { httpPost } from './httpServices';

export class AgentService {
  /** The same JWT is attached, so the agent acts AS the logged-in user (if any). */
  static async chat(message: string, conversationId: string | null): Promise<AgentReply> {
    return await httpPost<AgentReply>(`${agentApiUrl}/chat`, true, { message, conversationId });
  }
}
