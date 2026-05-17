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
  payload?: Record<string, unknown>;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO analytics.tour_event (event_type, plan_id, guest_id, payload)
     VALUES ($1, $2, $3, $4)`,
    [opts.eventType, opts.planId, opts.guestId, JSON.stringify(opts.payload ?? {})],
  );
}
