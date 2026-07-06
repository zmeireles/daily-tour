import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useOwnerJwt } from "@/store/owner-session";
import { useChatThreads, type ChatThread } from "./use-admin-chat";

// ── FE-only unread heuristic ────────────────────────────────────────────────
// The chat backend has NO unread concept — there is no such field in the DB or
// in the thread payload. We approximate it entirely on the client: per guest we
// remember the `last_ts` of the newest message the owner has *seen*, and treat a
// thread as unread when its current `last_ts` is newer than that watermark.
// "Seen" is recorded when the owner opens the thread and again after they send a
// reply (see chat-inbox.tsx). This is a heuristic — it is per-device
// (localStorage), resets if storage is cleared, and is deliberately not
// authoritative. `last_ts` values all come from the same server field (ISO-8601
// UTC, "…Z"), so a lexicographic `>` compares them correctly.

type ChatUnreadState = {
  // guest_id → the last_ts the owner has viewed for that thread.
  lastViewed: Record<string, string>;
  markViewed: (guestId: string, lastTs: string | null) => void;
};

export const useChatUnreadStore = create<ChatUnreadState>()(
  persist(
    (set) => ({
      lastViewed: {},
      markViewed: (guestId, lastTs) => {
        if (!lastTs) return;
        set((s) => {
          // Never move the watermark backwards.
          if (lastTs <= (s.lastViewed[guestId] ?? "")) return s;
          return { lastViewed: { ...s.lastViewed, [guestId]: lastTs } };
        });
      },
    }),
    { name: "admin-chat-viewed", storage: createJSONStorage(() => localStorage) },
  ),
);

// A thread is unread iff it has a last message newer than the owner's watermark.
export function isThreadUnread(thread: ChatThread, lastViewed: Record<string, string>): boolean {
  return !!thread.last_ts && thread.last_ts > (lastViewed[thread.guest_id] ?? "");
}

// Count of unread threads, for the nav badge. Inert without a session so the
// badge stays empty (and the shell nav test stays green) until the owner is
// authenticated — mirrors the jwt-`enabled` guard on the underlying query.
export function useUnreadChatCount(): number {
  const jwt = useOwnerJwt();
  const { data: threads } = useChatThreads();
  const lastViewed = useChatUnreadStore((s) => s.lastViewed);
  if (!jwt) return 0;
  return (threads ?? []).filter((t) => isThreadUnread(t, lastViewed)).length;
}
