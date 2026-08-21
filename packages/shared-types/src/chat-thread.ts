import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const ChatThreadSchema = z
  .object({
    id: UuidSchema,
    reservation_id: UuidSchema,
    owner_id: UuidSchema,
    created_at: IsoDateTimeSchema,
    last_message_at: IsoDateTimeSchema.optional(),
  })
  .strict();
export type ChatThread = z.infer<typeof ChatThreadSchema>;

/**
 * Sentinel the chat WebSocket client offers as its FIRST subprotocol, with the
 * guest JWT as the second entry: `["dt.jwt", "<jwt>"]`.
 *
 * The credential travels in `Sec-WebSocket-Protocol` rather than the query
 * string because D15 requires tokens are never echoed in logs, and a URL is
 * echoed into every log in the path — the BFF's own request log AND Traefik's
 * JSON access log, whose `RequestPath` field includes the query string and
 * offers no redaction of its own. Request headers are dropped from that log by
 * default. Browsers cannot set arbitrary headers on a WebSocket handshake, so
 * the subprotocol list is the standard carrier for one.
 *
 * A JWT is a legal subprotocol value: RFC 6455 requires RFC 7230 `token`
 * characters, and base64url plus `.` are all within that set.
 */
export const CHAT_JWT_SUBPROTOCOL = "dt.jwt";
