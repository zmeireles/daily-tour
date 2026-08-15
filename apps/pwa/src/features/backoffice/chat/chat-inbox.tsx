import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/lib/i18n/formatting-locale";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useLayoutMode } from "@/lib/responsive/use-layout-mode";
import {
  useReservations,
  type ReservationRow,
} from "@/features/backoffice/reservations/use-reservations";
import {
  useGuesthouses,
  type GuesthouseRow,
} from "@/features/backoffice/guesthouses/use-guesthouses";
import { formatDate } from "@/features/backoffice/reservations/agenda";
import {
  useChatThreads,
  useThreadHistory,
  useSendReply,
  type ChatThread,
  type AdminChatMessage,
} from "./use-admin-chat";
import { useChatUnreadStore, isThreadUnread } from "./use-chat-unread";
import { formatRelative, formatShortTime } from "./relative-time";

// When no reservation resolves a real name, fall back to a short, stable label
// derived from the opaque guest id.
function guestLabel(guestId: string): string {
  return guestId.length > 8 ? `${guestId.slice(0, 8)}…` : guestId;
}

// Guesthouse display name for the active locale, with graceful fallbacks. Mirrors
// the reservation-list.tsx helper.
function guesthouseName(gh: GuesthouseRow | undefined, locale: string): string {
  if (!gh) return "";
  const base = locale.split("-")[0] ?? locale;
  return gh.name[locale] ?? gh.name[base] ?? gh.name["en"] ?? Object.values(gh.name)[0] ?? "";
}

// Up to two initials for the avatar: first + last word.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Deterministic colour-by-hash so each guest keeps a stable avatar tint. Subtle
// translucent fills that read on both light and dark surfaces.
const AVATAR_TINTS = [
  "bg-red-500/15 text-red-700 dark:text-red-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
] as const;

function avatarTint(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length]!;
}

// The 3 greenfield quick-reply templates; keys map to chat.quick_reply.{key}
// (inserted text) and chat.quick_reply.{key}_label (chip label).
const QUICK_REPLIES = ["wifi", "checkin", "recommendations"] as const;

// A thread joined to its guest's reservation, ready to render.
interface EnrichedThread {
  thread: ChatThread;
  name: string;
  property: string;
  reservation: ReservationRow | undefined;
  unread: boolean;
}

function ThreadRow({
  row,
  selected,
  onSelect,
  locale,
}: {
  row: EnrichedThread;
  selected: boolean;
  onSelect: () => void;
  locale: string;
}) {
  const { thread, name, property, unread } = row;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      data-testid="chat-thread-row"
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 border-b px-4 py-3 text-left transition-colors",
        selected ? "bg-accent" : "hover:bg-muted/50",
      )}
    >
      <Avatar className="size-10">
        <AvatarFallback className={cn("text-sm font-medium", avatarTint(thread.guest_id))}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate", unread ? "font-semibold" : "font-medium")}>{name}</span>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatRelative(thread.last_ts, locale)}
          </time>
        </div>
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {property ? <span className="text-foreground/70">{property} · </span> : null}
            {thread.last_body ?? ""}
          </span>
          {unread ? (
            <span
              data-testid="chat-unread-dot"
              aria-label="unread"
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null}
        </div>
      </div>
    </button>
  );
}

// Owner-perspective bubble: the host (Miguel) is "me" and right-aligned, so the
// mapping is the INVERSE of the guest ChatBubble. We map by `direction` here
// rather than reusing the guest "me/them" convention: "outbound" = host = me.
// The sender label + timestamp are siblings of the testid'd body so the body's
// text and classes stay clean for the tests.
function MessageBubble({
  message,
  guestName,
  locale,
}: {
  message: AdminChatMessage;
  guestName: string;
  locale: string;
}) {
  const { t } = useTranslation("admin");
  const isOwner = message.direction === "outbound";
  const sender = isOwner ? t("chat.you", "You") : guestName;
  return (
    <div className={cn("flex", isOwner ? "justify-end" : "justify-start")}>
      <div
        className={cn("flex max-w-[75%] flex-col gap-0.5", isOwner ? "items-end" : "items-start")}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-2 text-sm leading-relaxed break-words",
            isOwner ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
          data-testid={`admin-chat-bubble-${isOwner ? "owner" : "guest"}`}
        >
          {message.body}
        </div>
        <span className="px-1 text-[10px] text-muted-foreground">
          {sender} · {formatShortTime(message.ts, locale)}
        </span>
      </div>
    </div>
  );
}

// The detail pane: guest/booking header · message history · sticky composer with
// quick-reply chips. Used full-height on mobile (with a back affordance) and as
// the right column on desktop.
function ThreadDetail({
  guestId,
  name,
  property,
  reservation,
  locale,
  showBack,
  onBack,
}: {
  guestId: string;
  name: string;
  property: string;
  reservation: ReservationRow | undefined;
  locale: string;
  showBack: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation("admin");
  const { data: messages, isLoading, isError, refetch } = useThreadHistory(guestId);
  const sendReply = useSendReply(guestId);
  const markViewed = useChatUnreadStore((s) => s.markViewed);
  const [draft, setDraft] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sendReply.isPending) return;
    sendReply.mutate(body, {
      onSuccess: (res) => {
        setDraft("");
        // Sending is an implicit "read" — advance the watermark past the reply.
        markViewed(guestId, res?.ts ?? null);
      },
    });
  }

  function insertQuickReply(key: (typeof QUICK_REPLIES)[number]) {
    const template = t(`chat.quick_reply.${key}`);
    setDraft((d) => (d ? `${d} ${template}` : template));
  }

  const bookingContext = reservation
    ? `${property ? " · " : ""}${formatDate(reservation.checkin, locale)} → ${formatDate(reservation.checkout, locale)}`
    : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b p-4">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("chat.back", "Back")}
            className="-ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{name}</span>
          {property || reservation ? (
            <span className="truncate text-xs text-muted-foreground">
              {property}
              {bookingContext}
            </span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-4">
        {isLoading ? (
          <LoadingState variant="thread" />
        ) : isError ? (
          <ErrorState
            description={t("chat.history_error", "Failed to load messages.")}
            onRetry={() => void refetch()}
          />
        ) : (
          (messages ?? []).map((m) => (
            <MessageBubble key={m.id} message={m} guestName={name} locale={locale} />
          ))
        )}
      </div>

      <div className="sticky bottom-0 border-t bg-background">
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {QUICK_REPLIES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => insertQuickReply(key)}
              className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(`chat.quick_reply.${key}_label`)}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chat.placeholder", "Type a reply…")}
            aria-label={t("chat.placeholder", "Type a reply…")}
            rows={2}
            className="min-h-0 flex-1 resize-none"
          />
          <Button type="submit" disabled={sendReply.isPending || draft.trim().length === 0}>
            {t("chat.send", "Send")}
          </Button>
        </form>
      </div>
    </div>
  );
}

// The list pane: search box + thread rows, with loading / empty / error / no-match
// states. Full-width on mobile; the left column on desktop.
function ThreadList({
  rows,
  total,
  isLoading,
  isError,
  selected,
  onSelect,
  onRetry,
  search,
  onSearch,
  locale,
  className,
}: {
  rows: EnrichedThread[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  selected: string | null;
  onSelect: (row: EnrichedThread) => void;
  onRetry: () => void;
  search: string;
  onSearch: (value: string) => void;
  locale: string;
  className?: string;
}) {
  const { t } = useTranslation("admin");
  return (
    <div className={cn("flex flex-col overflow-hidden", className)}>
      {total > 0 ? (
        <div className="border-b p-3">
          <Input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("chat.search_placeholder", "Search conversations")}
          />
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3">
            <LoadingState variant="thread" />
          </div>
        ) : isError ? (
          <div className="p-3">
            <ErrorState
              description={t("chat.threads_error", "Failed to load conversations.")}
              onRetry={onRetry}
              className="border-0 bg-transparent"
            />
          </div>
        ) : total === 0 ? (
          <div className="p-3">
            <EmptyState
              icon="MessagesSquare"
              title={t("empty_states.chat.title", "No conversations yet")}
              description={t(
                "empty_states.chat.description",
                "When a guest messages you from the app, the conversation will appear here.",
              )}
              className="border-0 bg-transparent"
            />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {t("chat.no_matches", "No conversations match your search.")}
          </p>
        ) : (
          rows.map((row) => (
            <ThreadRow
              key={row.thread.guest_id}
              row={row}
              selected={selected === row.thread.guest_id}
              onSelect={() => onSelect(row)}
              locale={locale}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Owner inbox. ≥lg: two-pane (thread list · detail side by side). <lg: single-pane
// master→detail push (list full-width; tapping a thread pushes the full-height
// detail with a back affordance). No live WebSocket on the owner side —
// useSendReply invalidates the history query so the reply appears.
export function ChatInbox() {
  const { t, i18n } = useTranslation("admin");
  const locale = formattingLocale(i18n.language);
  const mode = useLayoutMode();
  const { data: threads, isLoading, isError, refetch } = useChatThreads();
  const { data: resData } = useReservations();
  const { data: ghData } = useGuesthouses();
  const lastViewed = useChatUnreadStore((s) => s.lastViewed);
  const markViewed = useChatUnreadStore((s) => s.markViewed);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Join: resolve each thread's guest to their most-recent reservation (for the
  // real name + property). A guest_id may map to 0 or >1 reservations — pick the
  // latest check-in (id as a stable tiebreaker, mirroring reservation-list's
  // byCheckin) and fall back to the id label when nothing matches.
  const resByGuest = useMemo(() => {
    const map = new Map<string, ReservationRow>();
    for (const r of resData?.data ?? []) {
      const cur = map.get(r.guest_id);
      const newer =
        !cur ||
        r.checkin.localeCompare(cur.checkin) > 0 ||
        (r.checkin === cur.checkin && r.id.localeCompare(cur.id) > 0);
      if (newer) map.set(r.guest_id, r);
    }
    return map;
  }, [resData]);

  const ghById = useMemo(() => new Map((ghData?.data ?? []).map((gh) => [gh.id, gh])), [ghData]);

  const enriched = useMemo<EnrichedThread[]>(
    () =>
      (threads ?? []).map((thread) => {
        const reservation = resByGuest.get(thread.guest_id);
        const name = reservation?.guest_name ?? guestLabel(thread.guest_id);
        const property = reservation
          ? // Content language, NOT `locale`: this picks which translation of the
            // property name to show. Handing it the formatting locale is the same
            // conflation in reverse, and it only looks harmless today because
            // guesthouseName falls back through the base language.
            guesthouseName(ghById.get(reservation.guesthouse_id), i18n.language)
          : "";
        return { thread, name, property, reservation, unread: isThreadUnread(thread, lastViewed) };
      }),
    // `i18n.language` is listed in its own right: it now drives the property
    // name, and leaning on `locale` to change with it is an implicit coupling
    // that holds only while `formattingLocale` maps the four supported
    // languages to four distinct values.
    [threads, resByGuest, ghById, locale, i18n.language, lastViewed],
  );

  const query = search.trim().toLowerCase();
  const filtered = query
    ? enriched.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          (r.thread.last_body ?? "").toLowerCase().includes(query),
      )
    : enriched;

  const selectedRow = enriched.find((r) => r.thread.guest_id === selected);

  function openThread(row: EnrichedThread) {
    setSelected(row.thread.guest_id);
    // Opening a thread marks it read up to its newest message.
    markViewed(row.thread.guest_id, row.thread.last_ts);
  }

  const list = (className?: string) => (
    <ThreadList
      className={className}
      rows={filtered}
      total={enriched.length}
      isLoading={isLoading}
      isError={isError}
      selected={selected}
      onSelect={openThread}
      onRetry={() => void refetch()}
      search={search}
      onSearch={setSearch}
      locale={locale}
    />
  );

  const detail = (showBack: boolean) =>
    selectedRow ? (
      <ThreadDetail
        key={selectedRow.thread.guest_id}
        guestId={selectedRow.thread.guest_id}
        name={selectedRow.name}
        property={selectedRow.property}
        reservation={selectedRow.reservation}
        locale={locale}
        showBack={showBack}
        onBack={() => setSelected(null)}
      />
    ) : null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("chat.title", "Messages")}</h1>

      <div className="flex h-[70vh] overflow-hidden rounded-md border">
        {mode === "desktop" ? (
          <>
            {list("w-80 shrink-0 border-r")}
            {selectedRow ? (
              detail(false)
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">
                  {t("chat.select_thread", "Select a conversation to view messages.")}
                </p>
              </div>
            )}
          </>
        ) : selectedRow ? (
          detail(true)
        ) : (
          list("w-full")
        )}
      </div>
    </div>
  );
}
