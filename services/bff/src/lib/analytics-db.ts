import pg from "pg";
import { loadConfig } from "../config.js";
import { getMessageCount } from "./chat-client.js";

const { Pool } = pg;

let pool: pg.Pool | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: loadConfig().ANALYTICS_DATABASE_URL });
  }
  return pool;
}

export async function closeAnalyticsPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

// Test-only: swap a pre-built pool before createApp() is called.
export function setAnalyticsPoolForTest(next: pg.Pool | undefined): void {
  pool = next;
}

export async function insertTourEvent(opts: {
  eventType: string;
  planId: string | null;
  guestId: string | null;
  isBeta?: boolean;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO analytics.tour_event (event_type, plan_id, guest_id, is_beta, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      opts.eventType,
      opts.planId,
      opts.guestId,
      opts.isBeta ?? false,
      JSON.stringify(opts.payload ?? {}),
    ],
  );
}

// A single KPI: its value over the current period, the same figure over the
// immediately-preceding equal-length period, and the % change between them.
// `deltaPct` is null when `previous` is 0 — there is no meaningful "% change
// from zero", so the UI shows "—" rather than a fabricated ∞/100%.
// `available` is false when the KPI's data source is unreachable
// (`reservations`/`conversion` on a token-svc outage, `messages` on a chat-hub
// outage) — the UI then shows "sem dados" rather than a misleading 0 that
// contradicts other tabs.
export interface MetricDelta {
  value: number;
  previous: number;
  deltaPct: number | null;
  available: boolean;
}

export interface BetaMetrics {
  range_days: number;
  reservations: MetricDelta;
  views: MetricDelta;
  // reservations / views, rendered as a % by the frontend. NOT clamped to
  // [0, 1]: a booking can precede the guest opening their tour, so conversion
  // may legitimately read >100% (see `ratio`). Unavailable when views is 0.
  conversion: MetricDelta;
  messages: MetricDelta;
}

// Only `tour.started` (guest telemetry, view count) has a real producer in
// analytics.tour_event. Reservations come from token-svc and messages from
// chat-hub (both counted below); each degrades to "unavailable" on an outage
// rather than a fabricated 0.
const VIEWS_EVENT_TYPE = "tour.started";

const DEFAULT_RANGE_DAYS = 30;
const TOKEN_SVC_TIMEOUT_MS = 5_000;
const CHAT_HUB_TIMEOUT_MS = 5_000;

// reservations / views, guarded against divide-by-zero, rounded to 4 dp so the
// derived percentage is stable. NOT clamped to [0,1]: reservations can exceed
// views in this product (an owner registers a booking before the guest opens
// their tour), so conversion may legitimately read >100%. Callers must handle
// the denominator===0 case (we mark conversion unavailable rather than show a
// meaningless 0% next to real reservations).
function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 10000;
}

function toDelta(value: number, previous: number): MetricDelta {
  const deltaPct = previous === 0 ? null : Math.round(((value - previous) / previous) * 1000) / 10;
  return { value, previous, deltaPct, available: true };
}

// A KPI with no data source yet (or a transient source outage). Distinct from a
// real 0 so the UI can say "sem dados" instead of contradicting other tabs.
const UNAVAILABLE: MetricDelta = { value: 0, previous: 0, deltaPct: null, available: false };

// Count `tour.started` beta views in the current window and the equal window
// before it (one grouped scan of analytics.tour_event).
async function fetchViewCounts(rangeDays: number): Promise<{ cur: number; prev: number }> {
  const res = await getPool().query<{ period: "current" | "previous"; cnt: string }>(
    `SELECT
       CASE WHEN created_at >= now() - make_interval(days => $1::int)
            THEN 'current' ELSE 'previous' END AS period,
       COUNT(*) AS cnt
     FROM analytics.tour_event
     WHERE is_beta = true
       AND created_at >= now() - make_interval(days => $1::int * 2)
       AND event_type = $2
     GROUP BY period`,
    [rangeDays, VIEWS_EVENT_TYPE],
  );
  let cur = 0;
  let prev = 0;
  for (const row of res.rows) {
    if (row.period === "current") cur = Number(row.cnt);
    else prev = Number(row.cnt);
  }
  return { cur, prev };
}

interface ReservationListItem {
  created_at?: string | null;
  status?: string | null;
}

// Count real (non-cancelled) reservations (by booking time) from token-svc,
// bucketed into the current and previous windows. Single-owner v1 lists all
// reservations, so we count + filter client-side; a token-svc count endpoint
// with status/date filters should replace this at scale (follow-up). Counts are
// NOT beta-scoped — the reservation row has no beta discriminator yet, so
// beta-filtering is deferred (needs a token-svc schema column). Returns null on
// any outage/parse failure so the caller can mark the KPI unavailable WITHOUT
// blanking the other tiles.
async function fetchReservationCounts(
  rangeDays: number,
): Promise<{ cur: number; prev: number } | null> {
  const { TOKEN_SVC_URL } = loadConfig();
  try {
    const res = await fetch(`${TOKEN_SVC_URL}/v1/reservations`, {
      signal: AbortSignal.timeout(TOKEN_SVC_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: ReservationListItem[] };
    const rows = body.data ?? [];
    const now = Date.now();
    const curStart = now - rangeDays * 86_400_000;
    const prevStart = now - rangeDays * 2 * 86_400_000;
    let cur = 0;
    let prev = 0;
    for (const r of rows) {
      // A cancelled reservation is not a conversion; excluding it also keeps the
      // numerator honest against the beta-only view count (which never inflates).
      if (r.status === "cancelled") continue;
      const ts = r.created_at ? Date.parse(r.created_at) : NaN;
      if (Number.isNaN(ts)) continue;
      if (ts >= curStart) cur += 1;
      else if (ts >= prevStart) prev += 1;
    }
    return { cur, prev };
  } catch {
    return null;
  }
}

// Count guest (inbound) chat messages in the current + previous windows via
// chat-hub's count endpoint. Returns null on any outage/parse failure so the caller can mark the
// messages KPI unavailable WITHOUT blanking the other tiles (mirrors
// fetchReservationCounts). A malformed (non-numeric) body is treated as an
// outage rather than a fabricated 0.
async function fetchMessageCounts(
  rangeDays: number,
): Promise<{ cur: number; prev: number } | null> {
  try {
    const { current, previous } = await getMessageCount(
      rangeDays,
      AbortSignal.timeout(CHAT_HUB_TIMEOUT_MS),
    );
    // Body values are untrusted JSON despite the typed client: reject anything
    // non-numeric or non-finite (Number(null) === 0, JSON Infinity) as an
    // outage rather than surfacing a fabricated "available" 0.
    const cur: unknown = current;
    const prev: unknown = previous;
    if (typeof cur !== "number" || !Number.isFinite(cur)) return null;
    if (typeof prev !== "number" || !Number.isFinite(prev)) return null;
    return { cur, prev };
  } catch {
    return null;
  }
}

// Beta KPIs for the owner dashboard, over a `rangeDays` window plus the equal
// window immediately before it (for trend deltas). Views come from
// analytics.tour_event; reservations from token-svc (real booking counts);
// conversion is reservations/views; messages from chat-hub. Each remote source
// degrades independently — a token-svc outage marks reservations + conversion
// unavailable, a chat-hub outage marks messages unavailable, and views still
// return either way (no single failure blanks the whole dashboard).
export async function getBetaMetrics(opts: { rangeDays?: number } = {}): Promise<BetaMetrics> {
  const rangeDays = opts.rangeDays ?? DEFAULT_RANGE_DAYS;

  const [views, reservationCounts, messageCounts] = await Promise.all([
    fetchViewCounts(rangeDays),
    fetchReservationCounts(rangeDays),
    fetchMessageCounts(rangeDays),
  ]);

  // Messages are independent of token-svc: a reservations outage must not blank
  // a real messages count, and vice-versa.
  const messages =
    messageCounts === null ? UNAVAILABLE : toDelta(messageCounts.cur, messageCounts.prev);

  if (reservationCounts === null) {
    return {
      range_days: rangeDays,
      reservations: UNAVAILABLE,
      views: toDelta(views.cur, views.prev),
      conversion: UNAVAILABLE,
      messages,
    };
  }

  // No views in the current window → conversion is undefined, not 0%. Showing
  // "0%" beside a nonzero Reservations tile is the same contradictory-number
  // trap the dashboard exists to avoid, so mark it unavailable instead.
  const conversion =
    views.cur === 0
      ? UNAVAILABLE
      : toDelta(ratio(reservationCounts.cur, views.cur), ratio(reservationCounts.prev, views.prev));

  return {
    range_days: rangeDays,
    reservations: toDelta(reservationCounts.cur, reservationCounts.prev),
    views: toDelta(views.cur, views.prev),
    conversion,
    messages,
  };
}
