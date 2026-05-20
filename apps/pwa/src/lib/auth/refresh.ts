import { decodeJwt } from "./exchange";

const BFF_BASE = (import.meta.env as Record<string, string>).VITE_BFF_URL ?? "";

export interface RefreshResult {
  jwt: string;
  exp: number;
}

// Calls BFF /v1/auth/refresh — reads the HttpOnly dt_refresh cookie set by
// /r/:token, mints a fresh JWT. Returns null on any 4xx (the user has no
// active session) or network error; throws on unexpected shapes.
//
// Bootstrap flow expects null to mean "no session, fall through to public
// landing" — not an error to surface to the user.
export async function refreshSession(): Promise<RefreshResult | null> {
  let res: Response;
  try {
    res = await fetch(`${BFF_BASE}/v1/auth/refresh`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    // Network unreachable — bootstrap silently degrades. The PWA shell still
    // renders (public landing), and the user can re-link with a fresh /r/:token.
    return null;
  }

  if (res.status === 401) return null;
  if (!res.ok) return null;

  return (await res.json()) as RefreshResult;
}

export { decodeJwt };
