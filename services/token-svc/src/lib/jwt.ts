import { SignJWT } from "jose";
import { loadConfig } from "../config.js";

export interface ReservationJwtClaims {
  sub: string; // guest_id
  rid: string; // reservation_id
  gh: string; // guesthouse_id
  locale: string;
  jti: string; // = sha256(opaque)
}

// Lazy secret resolution so a test can swap JWT_SIGNING_KEY before first use.
let cachedSecret: Uint8Array | undefined;

function getSecret(): Uint8Array {
  if (!cachedSecret) {
    const config = loadConfig();
    cachedSecret = new TextEncoder().encode(config.JWT_SIGNING_KEY);
  }
  return cachedSecret;
}

export function resetJwtSecretCache(): void {
  cachedSecret = undefined;
}

// `expUnixSeconds` is the absolute expiration as a unix timestamp.
// The caller computes `min(checkout + 24h, now + 1h)` per FR-AC-04.
export async function signReservationJwt(
  claims: ReservationJwtClaims,
  expUnixSeconds: number,
): Promise<string> {
  return await new SignJWT({
    rid: claims.rid,
    gh: claims.gh,
    locale: claims.locale,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setJti(claims.jti)
    .setIssuedAt()
    .setExpirationTime(expUnixSeconds)
    .sign(getSecret());
}
