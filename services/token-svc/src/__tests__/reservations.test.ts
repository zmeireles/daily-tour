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

interface ReservationRow {
  id: string;
  guesthouse_id: string;
  guest_id: string;
  guest_name: string;
  checkin: string;
  checkout: string;
  party_size: number;
  locale: string;
  status: string;
  token_state: "none" | "active" | "revoked";
}

describe("token-svc reservations list + reservation-scoped revoke", () => {
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

  it("GET /v1/reservations — lists the reservation with guest name and token_state=none", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/reservations" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ data: ReservationRow[] }>();
    expect(body.data).toHaveLength(1);
    const row = body.data[0]!;
    expect(row.id).toBe(fixtures.reservationId);
    expect(row.guest_name).toBe("Test Guest");
    expect(row.party_size).toBe(2);
    expect(row.token_state).toBe("none");
  });

  it("GET /v1/reservations?guesthouse_id= — filters by guesthouse", async () => {
    const match = await app.inject({
      method: "GET",
      url: `/v1/reservations?guesthouse_id=${fixtures.guesthouseId}`,
    });
    expect(match.json<{ data: ReservationRow[] }>().data).toHaveLength(1);

    const other = await app.inject({
      method: "GET",
      url: "/v1/reservations?guesthouse_id=99999999-9999-4999-8999-999999999999",
    });
    expect(other.json<{ data: ReservationRow[] }>().data).toHaveLength(0);
  });

  it("token_state flips none → active → revoked across issue + reservation-scoped revoke", async () => {
    const issue = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    expect(issue.statusCode).toBe(200);

    const afterIssue = await app.inject({ method: "GET", url: "/v1/reservations" });
    expect(afterIssue.json<{ data: ReservationRow[] }>().data[0]!.token_state).toBe("active");

    const revoke = await app.inject({
      method: "DELETE",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    expect(revoke.statusCode).toBe(204);

    const afterRevoke = await app.inject({ method: "GET", url: "/v1/reservations" });
    expect(afterRevoke.json<{ data: ReservationRow[] }>().data[0]!.token_state).toBe("revoked");
  });

  it("issue → reservation-scoped revoke → exchange fails 401", async () => {
    const issue = await app.inject({
      method: "POST",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    const { token } = issue.json<{ token: string }>();

    const exchangeOk = await app.inject({ method: "GET", url: `/v1/tokens/${token}/exchange` });
    expect(exchangeOk.statusCode).toBe(200);

    const revoke = await app.inject({
      method: "DELETE",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    expect(revoke.statusCode).toBe(204);

    const exchangeFail = await app.inject({ method: "GET", url: `/v1/tokens/${token}/exchange` });
    expect(exchangeFail.statusCode).toBe(401);
  });

  it("DELETE /v1/reservations/:id/token is idempotent (204) and 404 for unknown reservation", async () => {
    const first = await app.inject({
      method: "DELETE",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    expect(first.statusCode).toBe(204);

    const second = await app.inject({
      method: "DELETE",
      url: `/v1/reservations/${fixtures.reservationId}/token`,
    });
    expect(second.statusCode).toBe(204);

    const unknown = await app.inject({
      method: "DELETE",
      url: "/v1/reservations/00000000-0000-4000-8000-000000000000/token",
    });
    expect(unknown.statusCode).toBe(404);
    expect(unknown.json()).toEqual({ error: "reservation_not_found" });
  });
});
