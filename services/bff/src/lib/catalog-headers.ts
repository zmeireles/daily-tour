import { loadConfig } from "../config.js";

// Every BFF→catalog-svc call must carry X-Internal-Token, or catalog-svc 401s.
// Centralised so a new call site cannot silently omit it — the failure mode
// would be a route that 401s only in qual, where the token is enforced.
//
// Merges with any caller headers (e.g. content-type on POST/PATCH) rather than
// replacing them.
export function catalogHeaders(extra?: Record<string, string>): Record<string, string> {
  const { CATALOG_SVC_INTERNAL_TOKEN } = loadConfig();
  return { "x-internal-token": CATALOG_SVC_INTERNAL_TOKEN, ...extra };
}
