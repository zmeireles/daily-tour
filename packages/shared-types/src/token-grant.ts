import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const TokenGrantSchema = z
  .object({
    jti: z.string(),
    reservation_id: UuidSchema,
    issued_at: IsoDateTimeSchema,
    expires_at: IsoDateTimeSchema,
    revoked_at: IsoDateTimeSchema.optional(),
  })
  .strict();
export type TokenGrant = z.infer<typeof TokenGrantSchema>;

// ─── Guest-JWT revocation cache ──────────────────────────────────────────
// token-svc WRITES this key when a grant is revoked; the BFF READS it on every
// `required`-posture request (and on chat-ws connect). The two live in separate
// services, so the convention lives here: a byte of drift between writer and
// reader is silent, and its failure mode is a revocation that reports success
// and enforces nothing.
export const JTI_REVOKED_PREFIX = "jti:revoked:";

export function jtiRevokedKey(jti: string): string {
  return `${JTI_REVOKED_PREFIX}${jti}`;
}

// A guest JWT's `exp` is capped at mint time to `now + GUEST_JWT_MAX_TTL_SECONDS`
// (token-svc's exchange route). So at the instant of a revoke, no already-minted
// JWT can outlive this window — it is exactly the TTL the revocation key needs,
// and the window a retry must re-cover.
export const GUEST_JWT_MAX_TTL_SECONDS = 60 * 60;
