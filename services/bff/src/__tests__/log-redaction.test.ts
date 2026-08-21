import { describe, expect, it } from "vitest";
import { CHAT_JWT_SUBPROTOCOL } from "@daily-tour/shared-types";

// Env MUST be set before any app import — config validates on first load.
process.env["JWT_SIGNING_KEY"] = "test-signing-key-do-not-use-min-32-chars-long";
process.env["REDIS_URL"] = "redis://127.0.0.1:1/0";
process.env["TOKEN_SVC_URL"] = "http://localhost:1";
process.env["CHAT_HUB_URL"] = "http://localhost:1";
process.env["NODE_ENV"] = "test";
process.env["LOG_LEVEL"] = "warn";
process.env["PORT"] = "8080";

const { redactUrlForLog, serializeRequestForLog } = await import("../app.js");

// A realistic-looking JWT: three base64url segments. Not signed with anything
// — the point is only that a credential-shaped string must not survive.
const JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" +
  ".eyJzdWIiOiJndWVzdC0xMjMiLCJqdGkiOiJhYmMifQ" +
  ".c2lnbmF0dXJlLXRoYXQtbXVzdC1uZXZlci1iZS1sb2dnZWQ";

describe("redactUrlForLog", () => {
  // Positive control. Without this, every assertion below could pass because
  // the function returns "" or mangles everything, and a redactor that eats
  // its input is indistinguishable from one that redacts.
  it("redacts the opaque redeem token in the path (control: it CAN redact)", () => {
    expect(redactUrlForLog("/v1/r/opaque-redeem-token-abc123")).toBe("/v1/r/[redacted]");
  });

  it("leaves a URL with no credential completely untouched", () => {
    expect(redactUrlForLog("/v1/discover?action=eat&km=5")).toBe("/v1/discover?action=eat&km=5");
  });

  it("redacts a `token` query parameter without dropping the parameter name", () => {
    const redacted = redactUrlForLog(`/v1/chat/ws?token=${JWT}`);
    expect(redacted).toBe("/v1/chat/ws?token=[redacted]");
    expect(redacted).not.toContain(JWT);
  });

  it("redacts `access_token` and matches the parameter name case-insensitively", () => {
    expect(redactUrlForLog(`/v1/anything?ACCESS_TOKEN=${JWT}`)).toBe(
      "/v1/anything?ACCESS_TOKEN=[redacted]",
    );
  });

  it("redacts only the credential, preserving its neighbours", () => {
    const redacted = redactUrlForLog(`/v1/discover?action=eat&token=${JWT}&km=5`);
    expect(redacted).toBe("/v1/discover?action=eat&token=[redacted]&km=5");
  });

  it("does not mistake a parameter that merely ends in `token` for a credential", () => {
    expect(redactUrlForLog("/v1/anything?csrf_token_present=true")).toBe(
      "/v1/anything?csrf_token_present=true",
    );
  });

  it("handles the degenerate inputs a request can actually produce", () => {
    expect(redactUrlForLog(undefined)).toBe("");
    expect(redactUrlForLog("/v1/chat/ws?token=")).toBe("/v1/chat/ws?token=[redacted]");
    expect(redactUrlForLog("/v1/anything?flag")).toBe("/v1/anything?flag");
  });
});

describe("serializeRequestForLog — the redaction is WIRED, not merely available", () => {
  // This is the assertion that matters. `redactUrlForLog` passing every test
  // above says nothing about whether the app's logger calls it; this exercises
  // the exact function object handed to Fastify as `serializers.req`.
  it("passes the logged url through the redactor", () => {
    const line = serializeRequestForLog({
      method: "GET",
      url: `/v1/chat/ws?token=${JWT}`,
      ip: "203.0.113.7",
    });
    expect(line.url).toBe("/v1/chat/ws?token=[redacted]");
    expect(JSON.stringify(line)).not.toContain(JWT);
  });

  it("keeps the method and remote address it is supposed to log", () => {
    const line = serializeRequestForLog({
      method: "POST",
      url: "/v1/tour-plans",
      ip: "203.0.113.7",
    });
    expect(line).toEqual({
      method: "POST",
      url: "/v1/tour-plans",
      remoteAddress: "203.0.113.7",
    });
  });
});

describe("the chat credential is not in the URL at all", () => {
  // Belt and braces on top of the redaction: the reason chat is safe is that
  // the JWT never reaches a URL, because Traefik's access log records the
  // query string in `RequestPath` and offers no redaction of its own — a sink
  // this service cannot mask. The subprotocol sentinel is what carries it.
  it("names a sentinel that is a legal RFC 6455 subprotocol value", () => {
    expect(CHAT_JWT_SUBPROTOCOL).toBe("dt.jwt");
    // RFC 7230 `token` characters — the set RFC 6455 requires. A sentinel with
    // a comma or a space in it would silently split the header.
    expect(CHAT_JWT_SUBPROTOCOL).toMatch(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/);
  });

  it("accepts a JWT as a subprotocol value (base64url and `.` are all tchar)", () => {
    expect(JWT).toMatch(/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/);
  });
});
