import { loadConfig } from "../config.js";

// X-Internal-Token headers for the three Python services (planner-svc, search-svc,
// chat-hub), which deny by default since dt-tests #44/#45.
//
// Centralised for the same reason as catalogHeaders: a new call site that forgets
// the header is a route that works locally and 401s only in qual, where the token
// is actually enforced. One helper per service so a call site cannot accidentally
// present chat-hub's token to planner-svc — the tokens are deliberately distinct,
// so that leaking one does not open the others.
//
// Each merges with caller-supplied headers (content-type on POST, say) rather
// than replacing them.
export function plannerHeaders(extra?: Record<string, string>): Record<string, string> {
  const { PLANNER_SVC_INTERNAL_TOKEN } = loadConfig();
  return { "x-internal-token": PLANNER_SVC_INTERNAL_TOKEN, ...extra };
}

export function searchHeaders(extra?: Record<string, string>): Record<string, string> {
  const { SEARCH_SVC_INTERNAL_TOKEN } = loadConfig();
  return { "x-internal-token": SEARCH_SVC_INTERNAL_TOKEN, ...extra };
}

export function chatHubHeaders(extra?: Record<string, string>): Record<string, string> {
  const { CHAT_HUB_INTERNAL_TOKEN } = loadConfig();
  return { "x-internal-token": CHAT_HUB_INTERNAL_TOKEN, ...extra };
}
