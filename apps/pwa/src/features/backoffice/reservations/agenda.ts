// Pure date helpers for the reservations agenda. No date-fns (it's an unused
// dependency): the three things this view needs — calendar-day bucketing, a
// night count, and a localized short date — are a few lines of native Intl plus
// arithmetic. Everything stays on the *local* calendar so the day never shifts
// under UTC. Mirrors the local-date stance of admin-today/lib.ts.

export type DayBucket = "today" | "tomorrow" | "this_week" | "later";

// The order agenda sections render in.
export const BUCKET_ORDER: readonly DayBucket[] = [
  "today",
  "tomorrow",
  "this_week",
  "later",
] as const;

// Reservation dates arrive either date-only ("2026-07-01") or as a full ISO
// timestamp; only the calendar-date portion matters here.
const dateOnly = (value: string): string => value.slice(0, 10);

// Parse `YYYY-MM-DD` as *local* midnight. `new Date("2026-07-01")` parses as UTC
// midnight — the previous day west of UTC — so we build the date component-wise.
function localMidnight(dateISO: string): Date {
  const [y, m, d] = dateOnly(dateISO).split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

const MS_PER_DAY = 86_400_000;

// Whole calendar days from `fromISO` to `toISO` (to − from). Negative when
// `toISO` precedes `fromISO`.
function dayDiff(fromISO: string, toISO: string): number {
  const from = localMidnight(fromISO).getTime();
  const to = localMidnight(toISO).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

// Local calendar date of `now` as `YYYY-MM-DD` — the anchor the agenda buckets
// against, same shape as reservation check-in fields. Kept here so agenda.ts is
// self-contained; mirrors admin-today/lib.ts `localTodayISO`.
export function localTodayISO(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Which agenda section a check-in date falls into, relative to `today`. A
// check-in that has already started (diff ≤ 0) buckets into "today", so an
// in-progress or just-passed stay stays pinned at the top rather than hiding
// under a future section.
export function dayBucket(dateISO: string, today: string): DayBucket {
  const diff = dayDiff(today, dateISO);
  if (diff <= 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "this_week";
  return "later";
}

// Nights between check-in and check-out (checkout − checkin). Same-day = 0;
// clamped at 0 so an inverted pair never yields a negative count.
export function nights(checkinISO: string, checkoutISO: string): number {
  return Math.max(0, dayDiff(checkinISO, checkoutISO));
}

// Localized short date, e.g. "25 jun 2026" (pt-PT) / "Jun 25, 2026" (en). Native
// Intl, local-parsed so the day never shifts under UTC.
export function formatDate(dateISO: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(localMidnight(dateISO));
}
