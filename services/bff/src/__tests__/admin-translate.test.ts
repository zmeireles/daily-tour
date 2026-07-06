import Fastify, { type FastifyInstance } from "fastify";
import { createLocalJWKSet } from "jose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import authPlugin from "../plugins/auth.js";
import ownerAuthPlugin from "../plugins/owner-auth.js";
import adminTranslateRoute from "../routes/admin-translate.js";
import {
  type AuthentikTestKeypair,
  makeAuthentikKeypair,
  signOwnerJwt,
} from "./authentik-keypair.js";
import {
  type TestRedisCtx,
  flushRedis,
  setTestEnv,
  startTestRedis,
  stopTestRedis,
} from "./helpers.js";

// Mock the Anthropic SDK so tests never touch the network. `mockCreate` stands
// in for client.messages.create; the two error classes let the route's
// `instanceof Anthropic.RateLimitError` check work against thrown instances.
const { mockCreate, MockAPIError, MockRateLimitError } = vi.hoisted(() => {
  class APIError extends Error {}
  class RateLimitError extends APIError {}
  return { mockCreate: vi.fn(), MockAPIError: APIError, MockRateLimitError: RateLimitError };
});

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { create: mockCreate };
    static APIError = MockAPIError;
    static RateLimitError = MockRateLimitError;
  }
  return { default: MockAnthropic };
});

const ctx: TestRedisCtx = await startTestRedis();
setTestEnv(ctx.url);
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.ANTHROPIC_MODEL = "test-opus-model";

const { resetConfigCache } = await import("../config.js");
const { setRedisForTest, closeRedis } = await import("../lib/redis.js");

async function buildTestApp(keypair: AuthentikTestKeypair): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const jwks = createLocalJWKSet(keypair.jwks);
  await app.register(authPlugin);
  await app.register(ownerAuthPlugin, { jwks });
  await app.register(adminTranslateRoute);
  await app.ready();
  return app;
}

const VALID_BODY = {
  source_locale: "en",
  target_locales: ["pt-PT"],
  fields: [{ key: "bio", text: "Welcome to our guesthouse.", kind: "prose" }],
};

// Shape a mocked messages.create success: a single text block whose text is the
// schema-conforming JSON the route parses.
function okResponse(translations: unknown) {
  return { content: [{ type: "text", text: JSON.stringify({ translations }) }] };
}

describe("BFF admin-translate route", () => {
  let app: FastifyInstance;
  let keypair: AuthentikTestKeypair;

  beforeAll(async () => {
    resetConfigCache();
    setRedisForTest(ctx.client);
    keypair = await makeAuthentikKeypair();
    app = await buildTestApp(keypair);
  });

  beforeEach(async () => {
    await flushRedis(ctx.client);
    mockCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.ANTHROPIC_MODEL = "test-opus-model";
    resetConfigCache();
  });

  afterAll(async () => {
    await app.close();
    await closeRedis();
    await stopTestRedis(ctx);
  });

  async function ownerJwt(): Promise<string> {
    return await signOwnerJwt({
      privateKey: keypair.privateKey,
      payload: { sub: "owner-uuid-1", aud: "staff" },
    });
  }

  function postTranslate(jwt: string | null, payload: unknown = VALID_BODY) {
    return app.inject({
      method: "POST",
      url: "/v1/admin/translate",
      headers: jwt ? { authorization: `Bearer ${jwt}` } : {},
      payload: payload as object,
    });
  }

  it("401 when no owner token is present", async () => {
    const res = await postTranslate(null);
    expect(res.statusCode).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  describe("400 invalid body", () => {
    it("empty fields", async () => {
      const jwt = await ownerJwt();
      const res = await postTranslate(jwt, { ...VALID_BODY, fields: [] });
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "invalid_body" });
    });

    it("target_locales includes source_locale", async () => {
      const jwt = await ownerJwt();
      const res = await postTranslate(jwt, {
        source_locale: "en",
        target_locales: ["en"],
        fields: [{ key: "bio", text: "hi" }],
      });
      expect(res.statusCode).toBe(400);
    });

    it("text longer than 4000 chars", async () => {
      const jwt = await ownerJwt();
      const res = await postTranslate(jwt, {
        source_locale: "en",
        target_locales: ["pt-PT"],
        fields: [{ key: "bio", text: "a".repeat(4001) }],
      });
      expect(res.statusCode).toBe(400);
    });

    it("unknown locale", async () => {
      const jwt = await ownerJwt();
      const res = await postTranslate(jwt, {
        source_locale: "fr",
        target_locales: ["pt-PT"],
        fields: [{ key: "bio", text: "hi" }],
      });
      expect(res.statusCode).toBe(400);
    });

    it("does not call the model on a validation failure", async () => {
      const jwt = await ownerJwt();
      await postTranslate(jwt, { ...VALID_BODY, fields: [] });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  it("200 happy path — echoes keys, one value per target, uses configured model + params", async () => {
    const jwt = await ownerJwt();
    mockCreate.mockResolvedValue(
      okResponse([
        {
          key: "bio",
          values: [
            { locale: "pt-PT", text: "Bem-vindo à nossa casa de hóspedes." },
            { locale: "es", text: "Bienvenido a nuestra casa de huéspedes." },
          ],
        },
        {
          key: "name",
          values: [
            { locale: "pt-PT", text: "Casa da Calheta" },
            { locale: "es", text: "Casa da Calheta" },
          ],
        },
      ]),
    );

    const res = await postTranslate(jwt, {
      source_locale: "en",
      target_locales: ["pt-PT", "es"],
      fields: [
        { key: "bio", text: "Welcome to our guesthouse.", kind: "prose" },
        { key: "name", text: "Casa da Calheta", kind: "proper_name" },
      ],
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{
      translations: { key: string; values: { locale: string; text: string }[] }[];
    }>();
    expect(body.translations.map((t) => t.key)).toEqual(["bio", "name"]);
    for (const t of body.translations) {
      expect(t.values.map((v) => v.locale)).toEqual(["pt-PT", "es"]);
    }

    // Assert the exact Anthropic call shape: model comes from config; NO
    // temperature/top_p/top_k, NO thinking config (Opus 4.8 would 400);
    // effort:low + structured outputs; max_tokens sized for the input envelope.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArg = mockCreate.mock.calls[0][0] as Record<string, unknown>;
    expect(callArg.model).toBe("test-opus-model");
    expect(callArg.max_tokens).toBe(16_000);
    expect(callArg).not.toHaveProperty("temperature");
    expect(callArg).not.toHaveProperty("top_p");
    expect(callArg).not.toHaveProperty("top_k");
    expect(callArg).not.toHaveProperty("thinking");
    expect(callArg.output_config).toMatchObject({
      effort: "low",
      format: { type: "json_schema" },
    });
  });

  it("503 when ANTHROPIC_API_KEY is unset — guards before constructing the client", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    resetConfigCache();
    const jwt = await ownerJwt();
    const res = await postTranslate(jwt);
    expect(res.statusCode).toBe(503);
    expect(res.json()).toMatchObject({ error: "translation_unavailable" });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("502 when the model call throws an APIError", async () => {
    const jwt = await ownerJwt();
    mockCreate.mockRejectedValue(new MockAPIError("upstream boom"));
    const res = await postTranslate(jwt);
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "translation_failed" });
  });

  it("502 when the model returns unparseable content", async () => {
    const jwt = await ownerJwt();
    mockCreate.mockResolvedValue({ content: [{ type: "text", text: "not json {{{" }] });
    const res = await postTranslate(jwt);
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "translation_failed" });
  });

  it("502 translation_truncated when the model hits the output cap", async () => {
    const jwt = await ownerJwt();
    mockCreate.mockResolvedValue({
      stop_reason: "max_tokens",
      content: [{ type: "text", text: "{" }],
    });
    const res = await postTranslate(jwt);
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "translation_truncated" });
  });

  it("502 when the response violates the request contract (missing a requested target locale)", async () => {
    const jwt = await ownerJwt();
    // Asked for pt-PT + es; model returns only pt-PT.
    mockCreate.mockResolvedValue(
      okResponse([{ key: "bio", values: [{ locale: "pt-PT", text: "olá" }] }]),
    );
    const res = await postTranslate(jwt, {
      source_locale: "en",
      target_locales: ["pt-PT", "es"],
      fields: [{ key: "bio", text: "hi", kind: "prose" }],
    });
    expect(res.statusCode).toBe(502);
    expect(res.json()).toMatchObject({ error: "translation_failed" });
  });

  it("429 when the model call throws a RateLimitError", async () => {
    const jwt = await ownerJwt();
    mockCreate.mockRejectedValue(new MockRateLimitError("slow down"));
    const res = await postTranslate(jwt);
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ error: "translation_rate_limited" });
  });
});
