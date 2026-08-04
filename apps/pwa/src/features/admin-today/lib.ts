import type { ReservationRow } from "@/features/backoffice/reservations/use-reservations";
import type { PlaceRow } from "@/features/backoffice/places/use-places";

// Local calendar date as `YYYY-MM-DD` — the same shape reservation check-in /
// check-out fields carry ("2026-07-01"), so tile counts compare like-for-like
// in the owner's own timezone.
export function localTodayISO(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type GreetingKey = "morning" | "afternoon" | "evening";

export function greetingKey(hour: number): GreetingKey {
  if (hour < 12) return "morning";
  if (hour < 19) return "afternoon";
  return "evening";
}

// Reservation dates may arrive date-only or as a full ISO timestamp; the date
// portion is all "today" cares about.
const dateOnly = (value: string): string => value.slice(0, 10);

export function countCheckinsToday(rows: ReservationRow[], today: string): number {
  return rows.filter((r) => dateOnly(r.checkin) === today).length;
}

export function countCheckoutsToday(rows: ReservationRow[], today: string): number {
  return rows.filter((r) => dateOnly(r.checkout) === today).length;
}

// "Pending" for a host = a confirmed booking whose guest access link has not been
// sent/activated yet (token_state "none" or "revoked") — a real to-do: send the /r/
// link. Reservations are never literally "pending" (the lifecycle is confirmed →
// checked_in → checked_out / cancelled), so we derive the actionable meaning here.
export function countPending(rows: ReservationRow[]): number {
  return rows.filter((r) => r.status === "confirmed" && r.token_state !== "active").length;
}

export function countActiveLinks(rows: ReservationRow[]): number {
  return rows.filter((r) => r.token_state === "active").length;
}

// "Needs attention" = not yet live for guests: draft or owner-approved-but-not-
// -published. (The list endpoint omits `media`, so photo-completeness can't be
// derived here — status is the reliable client-side signal.)
export function countPlacesNeedingAttention(rows: PlaceRow[]): number {
  return rows.filter((r) => r.status === "draft" || r.status === "owner_approved").length;
}

// Localized display name for an owner property: current language first, then the
// base language, then the PT-PT / EN owner baselines, then any value present.
//
// The base-language step is load-bearing, not defensive. Name maps are keyed by
// the content locales (`en`, `pt-PT`, `es`), but callers pass `i18n.language`,
// which is a browser tag — an English owner reports `en-US`, which matches no
// key and used to fall through to the **pt-PT** baseline. Every English-browser
// owner was reading Portuguese property names. Splitting the region makes this
// independent of however i18next happens to normalize the tag, and matches
// `guesthouseName` in reservation-list.tsx, which already did it.
export function localizedName(name: Record<string, string>, lang: string): string {
  const base = lang.split("-")[0] ?? lang;
  return name[lang] ?? name[base] ?? name["pt-PT"] ?? name["en"] ?? Object.values(name)[0] ?? "";
}
