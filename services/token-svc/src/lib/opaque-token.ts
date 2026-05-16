import { createHash, randomBytes } from "node:crypto";

// 24 bytes → 32 base64url chars. Opaque tokens are URL-safe and unguessable.
const TOKEN_BYTES = 24;

export function generateOpaqueToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

// Store the SHA-256 hash, not the raw token. If the token_grant table leaks,
// the attacker still needs the original opaque string to use any of them.
// Also used as the JWT `jti` so the BFF can revoke by JWT contents alone.
export function hashOpaqueToken(opaque: string): string {
  return createHash("sha256").update(opaque, "utf8").digest("base64url");
}
