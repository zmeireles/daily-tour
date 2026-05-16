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
const { hashOpaqueToken } = await import("../lib/opaque-token.js");

describe("DELETE /v1/tokens/:jti", () => {
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

  it("204 on first revoke; 204 again (idempotent); subsequent exchange 401", async () => {
    const issueRes = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    const { token } = issueRes.json<{ token: string }>();
    const jti = hashOpaqueToken(token);

    const first = await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({ method: "DELETE", url: `/v1/tokens/${jti}` });
    expect(second.statusCode).toBe(204);

    const exchange = await app.inject({
      method: "GET",
      url: `/v1/tokens/${token}/exchange`,
    });
    expect(exchange.statusCode).toBe(401);
  });

  it("404 for an unknown jti", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/tokens/never-existed-jti-aaaaaaaaaaaaaaaaaaa",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: "token_not_found" });
  });
});
