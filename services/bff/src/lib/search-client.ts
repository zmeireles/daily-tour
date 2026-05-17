import { loadConfig } from "../config.js";

export class SearchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SearchError";
  }
}

export interface SearchResultItem {
  place_id: string;
  distance_km: number;
  score: number | null;
}

export interface SearchResponse {
  action: string;
  wish: string | null;
  count: number;
  reranked: boolean;
  results: SearchResultItem[];
}

export async function queryPlaces(params: {
  action: string;
  lat: number;
  lng: number;
  km: number;
  limit?: number;
}): Promise<SearchResponse> {
  const { SEARCH_SVC_URL } = loadConfig();
  const res = await fetch(`${SEARCH_SVC_URL}/v1/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: params.action,
      loc: { lat: params.lat, lng: params.lng },
      km: params.km,
      limit: params.limit ?? 30,
    }),
  });
  if (!res.ok) {
    throw new SearchError(res.status, `search-svc ${res.status}`);
  }
  return (await res.json()) as SearchResponse;
}
