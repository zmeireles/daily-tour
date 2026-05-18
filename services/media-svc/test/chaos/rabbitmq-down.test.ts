import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  type TestCtx,
  setTestEnv,
  startTestPostgres,
  stopTestPostgres,
} from "../helpers.js";

// vi.hoisted so the mock factory can reference mockConnect before hoisting.
const { mockConnect } = vi.hoisted(() => ({ mockConnect: vi.fn() }));

vi.mock("amqplib", () => ({
  default: { connect: mockConnect },
}));

// Boot testcontainers Postgres and set env vars before importing config-dependent modules.
const ctx: TestCtx = await startTestPostgres();
setTestEnv(ctx.databaseUrl);

const { runTranscodeWorker } = await import("../../src/workers/transcode.js");
const { closePool } = await import("../../src/db.js");
const { resetConfigCache } = await import("../../src/config.js");

beforeAll(() => {
  resetConfigCache();
});

afterAll(async () => {
  await closePool();
  await stopTestPostgres(ctx);
});

afterEach(() => {
  mockConnect.mockReset();
});

describe("chaos: RabbitMQ down — transcode worker", () => {
  it("runTranscodeWorker rejects when AMQP connection is refused", async () => {
    mockConnect.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5672"));

    await expect(runTranscodeWorker()).rejects.toThrow("ECONNREFUSED");
  });

  it("rejection is caught by index.ts .catch() — HTTP server survives worker failure", async () => {
    // Reproduces the pattern in src/index.ts line 26:
    //   runTranscodeWorker().catch((err) => { app.log.error(...); })
    // The promise rejects but the surrounding HTTP server code is unaffected.
    mockConnect.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5672"));

    let caughtError: unknown;
    await runTranscodeWorker().catch((err: unknown) => {
      caughtError = err;
    });

    expect(caughtError).toBeInstanceOf(Error);
    expect((caughtError as Error).message).toContain("ECONNREFUSED");
  });

  it("no internal reconnect — known gap, Phase 5 follow-up", async () => {
    // runTranscodeWorker() is a one-shot setup function: it calls amqp.connect()
    // exactly once and returns (or rejects). There is no retry loop or backoff.
    // If the connection drops after startup, the consumer silently stops.
    // A reconnect loop with exponential back-off is tracked as a Phase 5 task.
    mockConnect.mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:5672"));

    await runTranscodeWorker().catch(() => {});
    await runTranscodeWorker().catch(() => {});

    // Each explicit call triggered exactly one amqp.connect() — no internal retries.
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });
});
