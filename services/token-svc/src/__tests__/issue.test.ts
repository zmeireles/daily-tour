import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  type SeededFixtures,
  seedFixtures,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
  truncateAll,
} from "./helpers.js";

const ctx = await startTestPostgres();
let fixtures: SeededFixtures;
setTestEnv(ctx.databaseUrl);

const { createApp } = await import("../app.js");
const { closePool } = await import("../db/client.js");
const { resetConfigCache } = await import("../config.js");
const { resetJwtSecretCache } = await import("../lib/jwt.js");

describe("POST /v1/reservations/:id/token", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeAll(async () => {
    resetConfigCache();
    resetJwtSecretCache();
    app = await createApp();
  });

  beforeEach(async () => {
    await truncateAll(ctx.pool);
    fixtures = await seedFixtures(ctx.pool);
  });

  afterAll(async () => {
    await app.close();
    await closePool();
    await stopTestPostgres(ctx);
  });

  it("happy path — returns an opaque token + future expires_at", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ token: string; expires_at: string }>();
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(Date.parse(body.expires_at)).toBeGreaterThan(Date.now());
  });

  it("404 when reservation does not exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/reservations/00000000-0000-4000-8000-000000000000/token",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "reservation_not_found" });
  });

  it("400 when reservation id is not a uuid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/reservations/not-a-uuid/token",
    });
    expect(res.statusCode).toBe(400);
  });
});
