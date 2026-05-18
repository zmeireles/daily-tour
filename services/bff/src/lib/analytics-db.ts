import pg from "pg";
import { loadConfig } from "../config.js";

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

export async function insertGuestFeedback(opts: {
  guestId: string | null;
  rating: number;
  text: string | null;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO catalog.guest_feedback (guest_id, rating, text)
     VALUES ($1, $2, $3)`,
    [opts.guestId, opts.rating, opts.text],
  );
}

export interface BetaMetrics {
  total_guests: number;
  tour_completion_rate: number;
  average_rating: number | null;
  top_places: Array<{ place_id: string; engagement_count: number }>;
  drop_off_funnel: { started: number; completed: number };
}

export async function getBetaMetrics(): Promise<BetaMetrics> {
  const db = getPool();
  const windowSql = `created_at >= now() - interval '30 days' AND is_beta = true`;

  const [guestsRes, funnelRes, ratingRes, topPlacesRes] = await Promise.all([
    db.query<{ total: string }>(
      `SELECT COUNT(DISTINCT guest_id) AS total FROM analytics.tour_event WHERE ${windowSql}`,
    ),
    db.query<{ event_type: string; cnt: string }>(
      `SELECT event_type, COUNT(*) AS cnt
       FROM analytics.tour_event
       WHERE ${windowSql} AND event_type IN ('tour.started', 'tour.completed')
       GROUP BY event_type`,
    ),
    db.query<{ avg: string | null }>(
      `SELECT ROUND(AVG(rating)::numeric, 2)::float AS avg FROM catalog.guest_feedback
       WHERE created_at >= now() - interval '30 days'`,
    ),
    db.query<{ place_id: string; cnt: string }>(
      `SELECT payload->>'place_id' AS place_id, COUNT(*) AS cnt
       FROM analytics.tour_event
       WHERE ${windowSql} AND payload->>'place_id' IS NOT NULL
       GROUP BY payload->>'place_id'
       ORDER BY cnt DESC
       LIMIT 5`,
    ),
  ]);

  const funnelMap: Record<string, number> = {};
  for (const row of funnelRes.rows) {
    funnelMap[row.event_type] = parseInt(row.cnt, 10);
  }
  const started = funnelMap["tour.started"] ?? 0;
  const completed = funnelMap["tour.completed"] ?? 0;

  return {
    total_guests: parseInt(guestsRes.rows[0]?.total ?? "0", 10),
    tour_completion_rate: started > 0 ? Math.round((completed / started) * 100) / 100 : 0,
    average_rating: ratingRes.rows[0]?.avg != null ? parseFloat(ratingRes.rows[0].avg) : null,
    top_places: topPlacesRes.rows.map((r) => ({
      place_id: r.place_id,
      engagement_count: parseInt(r.cnt, 10),
    })),
    drop_off_funnel: { started, completed },
  };
}
