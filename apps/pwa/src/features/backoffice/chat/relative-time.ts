// Time helpers for the owner chat inbox. Native Intl only — no date-fns.
// `formatRelative` powers the thread-row recency label ("há 2 dias" / "2 days
// ago" / "hace 2 días"); `formatShortTime` powers the per-bubble timestamp.

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

// Local midnight of a Date, so day boundaries are the calendar's, not a rolling
// 24h window — mirrors agenda.ts's local-date stance.
function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Largest sensible unit, relative to now. At day granularity we count whole
// *calendar* days (local midnights) so a message from late yesterday reads
// "yesterday", not "20 hours ago"; below a day we fall back to wall-clock
// hours/minutes/seconds. `numeric: "auto"` yields "yesterday"/"ontem"/"ayer".
export function formatRelative(iso: string | null, locale: string): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const now = new Date();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const dayDelta = Math.round(
    (localMidnight(then).getTime() - localMidnight(now).getTime()) / MS_PER_DAY,
  );
  if (Math.abs(dayDelta) >= 1) return rtf.format(dayDelta, "day");

  const diffMs = then.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  if (absMs < MS_PER_MINUTE) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absMs < MS_PER_HOUR) return rtf.format(Math.round(diffMs / MS_PER_MINUTE), "minute");
  return rtf.format(Math.round(diffMs / MS_PER_HOUR), "hour");
}

// Localized short time, e.g. "09:05" (pt-PT) / "9:05 AM" (en) — the per-bubble
// timestamp. Empty string for a null/invalid value.
export function formatShortTime(iso: string | null, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
}
