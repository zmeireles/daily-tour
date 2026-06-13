import { decodeJwt as joseDecode } from "jose";

const BFF_BASE = (import.meta.env as Record<string, string>).VITE_BFF_URL ?? "";

export class TokenExpiredError extends Error {
  constructor() {
    super("token_expired");
    this.name = "TokenExpiredError";
  }
}

export class TokenInvalidError extends Error {
  constructor() {
    super("token_invalid");
    this.name = "TokenInvalidError";
  }
}

export async function exchangeOpaqueToken(opaque: string): Promise<{ jwt: string; exp: number }> {
  // Redeem under /v1 (the BFF route): on a same-origin apex deployment the
  // browser route `/r/:token` is owned by the SPA, while this XHR must reach
  // the BFF via the apex `/v1` path-router. The opaque token is unchanged.
  const url = `${BFF_BASE}/v1/r/${encodeURIComponent(opaque)}`;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    redirect: "manual",
  });

  // Status 0 + opaqueredirect is fetch's response to a manual-redirect 302.
  if (res.type === "opaqueredirect" || res.status === 302) {
    throw new TokenExpiredError();
  }
  if (res.status === 401 || res.status === 404) {
    throw new TokenInvalidError();
  }
  if (!res.ok) {
    throw new Error(`exchange failed: ${res.status}`);
  }
  return (await res.json()) as { jwt: string; exp: number };
}

// Lightweight no-verify decode for surfacing claims into the Zustand store.
// The BFF is the trust boundary — it verified the JWT signature.
export function decodeJwt(jwt: string): {
  sub: string;
  rid: string;
  gh: string;
  locale: string;
  jti: string;
  exp: number;
} {
  return joseDecode(jwt) as unknown as {
    sub: string;
    rid: string;
    gh: string;
    locale: string;
    jti: string;
    exp: number;
  };
}
