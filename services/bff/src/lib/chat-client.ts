import { loadConfig } from "../config.js";

export class ChatHubError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ChatHubError";
  }
}

export interface ChatHistoryMessage {
  id: string;
  channel: string;
  sender_id: string;
  direction: string;
  body: string;
  ts: string;
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[];
}

/**
 * Fetch a guest's persisted chat history from chat-hub (T-4.0.1).
 *
 * chat-hub is not internet-facing — the BFF is its only caller, deriving
 * guestId from the JWT `sub` (the same value the chat-ws bridge forwards as
 * the WS client_id), so the read path and the live socket share one identity.
 */
export async function getChatHistory(guestId: string): Promise<ChatHistoryResponse> {
  const { CHAT_HUB_URL } = loadConfig();
  const res = await fetch(`${CHAT_HUB_URL}/v1/history/${encodeURIComponent(guestId)}`);
  if (!res.ok) {
    throw new ChatHubError(res.status, `chat-hub ${res.status}`);
  }
  return (await res.json()) as ChatHistoryResponse;
}
