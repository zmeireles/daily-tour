import { loadConfig } from "../config.js";
import { chatHubHeaders } from "./internal-headers.js";

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
  const res = await fetch(`${CHAT_HUB_URL}/v1/history/${encodeURIComponent(guestId)}`, {
    headers: chatHubHeaders(),
  });
  if (!res.ok) {
    throw new ChatHubError(res.status, `chat-hub ${res.status}`);
  }
  return (await res.json()) as ChatHistoryResponse;
}

export interface HostReplyResponse {
  id: string;
  ts: string;
  delivered: boolean;
}

export interface ChatThread {
  guest_id: string;
  last_body: string | null;
  last_ts: string | null;
  updated_at: string;
}

/**
 * Post a host→guest reply to chat-hub (T-4.x, owner-gated path). The owner
 * backoffice reaches this only through the BFF's `auth: "owner"` proxy; the
 * guestId is the thread key, mirroring `getChatHistory`'s identity model.
 */
export async function postHostReply(guestId: string, body: string): Promise<HostReplyResponse> {
  const { CHAT_HUB_URL } = loadConfig();
  const res = await fetch(`${CHAT_HUB_URL}/v1/reply/${encodeURIComponent(guestId)}`, {
    method: "POST",
    headers: chatHubHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    throw new ChatHubError(res.status, `chat-hub ${res.status}`);
  }
  return (await res.json()) as HostReplyResponse;
}

/**
 * List every guest thread for the owner inbox. chat-hub returns the threads
 * pre-sorted; the BFF forwards the array verbatim (no owner-side filtering in
 * single-owner v1).
 */
export async function listChatThreads(): Promise<ChatThread[]> {
  const { CHAT_HUB_URL } = loadConfig();
  const res = await fetch(`${CHAT_HUB_URL}/v1/threads`, { headers: chatHubHeaders() });
  if (!res.ok) {
    throw new ChatHubError(res.status, `chat-hub ${res.status}`);
  }
  return (await res.json()) as ChatThread[];
}

export interface MessageCountResponse {
  current: number;
  previous: number;
}

/**
 * Guest (inbound) chat messages in the current `rangeDays` window and the equal
 * window before it — powers the owner dashboard's "messages" KPI as a measure of
 * guest demand (host replies are excluded server-side). Accepts an optional
 * AbortSignal so the metrics caller can bound the wait and degrade gracefully.
 */
export async function getMessageCount(
  rangeDays: number,
  signal?: AbortSignal,
): Promise<MessageCountResponse> {
  const { CHAT_HUB_URL } = loadConfig();
  const res = await fetch(`${CHAT_HUB_URL}/v1/messages/count?range_days=${rangeDays}`, {
    signal,
    headers: chatHubHeaders(),
  });
  if (!res.ok) {
    throw new ChatHubError(res.status, `chat-hub ${res.status}`);
  }
  return (await res.json()) as MessageCountResponse;
}
