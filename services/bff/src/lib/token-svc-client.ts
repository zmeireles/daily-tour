import { loadConfig } from "../config.js";

export class TokenExchangeError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TokenExchangeError";
  }
}

export interface ExchangeResult {
  jwt: string;
  exp: number;
}

// Calls token-svc's GET /v1/tokens/:opaque/exchange. Throws TokenExchangeError
// on any non-2xx so the route handler can map 401/404 → 302 graceful-degrade
// and propagate everything else as 5xx.
export async function exchangeOpaqueToken(opaque: string): Promise<ExchangeResult> {
  const config = loadConfig();
  const url = `${config.TOKEN_SVC_URL}/v1/tokens/${encodeURIComponent(opaque)}/exchange`;
  const res = await fetch(url, { method: "GET" });
  if (res.status === 401 || res.status === 404) {
    throw new TokenExchangeError(res.status, "invalid_token");
  }
  if (!res.ok) {
    throw new TokenExchangeError(res.status, `token-svc ${res.status}`);
  }
  return (await res.json()) as ExchangeResult;
}
