import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOwnerJwt } from "@/store/owner-session";

const THREADS_KEY = ["admin", "chat", "threads"] as const;
const historyKey = (guestId: string) => ["admin", "chat", "history", guestId] as const;

// A row in the owner inbox thread list. `last_ts` is the recency anchor
// (BFF orders newest-first by it); `updated_at` is thread-creation time and is
// intentionally not used for sorting or display.
export interface ChatThread {
  guest_id: string;
  last_body: string | null;
  last_ts: string | null;
  updated_at: string;
}

// One persisted message in a guest's history. `direction` is the guest's
// perspective from the server: "inbound" = guest→host, "outbound" = host→guest.
export interface AdminChatMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  ts: string;
}

interface SendReplyResponse {
  id: string;
  ts: string;
  delivered: boolean;
}

function authHeader(jwt: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}` };
}

export function useChatThreads() {
  const jwt = useOwnerJwt();
  return useQuery<ChatThread[]>({
    queryKey: THREADS_KEY,
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/v1/admin/chat/threads", { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`chat threads ${res.status}`);
      return res.json() as Promise<ChatThread[]>;
    },
  });
}

export function useThreadHistory(guestId: string | null) {
  const jwt = useOwnerJwt();
  return useQuery<AdminChatMessage[]>({
    queryKey: historyKey(guestId ?? ""),
    enabled: !!jwt && !!guestId,
    queryFn: async () => {
      const res = await fetch(`/v1/admin/chat/${guestId}/history`, { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`chat history ${res.status}`);
      // The BFF forwards chat-hub's history verbatim as { messages: [...] }
      // (same wrapper the guest path unwraps in use-chat-ws.ts). Unwrap here.
      const data = (await res.json()) as { messages: AdminChatMessage[] };
      return data.messages ?? [];
    },
  });
}

// Post a host reply to a guest. On success, invalidate that guest's history so
// the sent message appears (no live WebSocket on the owner side).
export function useSendReply(guestId: string) {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation<SendReplyResponse, Error, string>({
    mutationFn: async (body: string) => {
      const res = await fetch(`/v1/admin/chat/${guestId}/reply`, {
        method: "POST",
        headers: { ...authHeader(jwt!), "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) throw new Error(`send reply ${res.status}`);
      return res.json() as Promise<SendReplyResponse>;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: historyKey(guestId) }),
  });
}
