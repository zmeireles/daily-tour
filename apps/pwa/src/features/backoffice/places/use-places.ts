import { requestError } from "@/lib/api/request-error";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOwnerJwt } from "@/store/owner-session";

const PLACES_KEY = ["admin", "places"] as const;

export interface PlaceMediaItem {
  id: string;
  kind: string;
  url: string;
  alt?: Record<string, string> | null;
  sort_order: number;
}

export interface PlaceSocialLink {
  kind: string;
  handle: string;
}

export interface PlaceContacts {
  phone?: string;
  email?: string;
  website?: string;
  social?: PlaceSocialLink[];
}

export interface PlaceHoursEntry {
  dow: number;
  open: string;
  close: string;
}

/** A place's action tags — same shape read and written, so the form round-trips. */
export interface PlaceActionTag {
  action_slug: string;
  wish_slugs: string[];
}

/** One action of the taxonomy, with the wishes selectable under it. */
export interface ActionTaxonomyEntry {
  slug: string;
  icon: string;
  label_i18n: Record<string, string>;
  wishes: { slug: string; label_i18n: Record<string, string> }[];
}

export interface PlaceRow {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  address: string;
  status: string;
  geom_lat: number;
  geom_lng: number;
  is_hosts_pick: boolean;
  source_kind: string;
  source_ref?: string | null;
  created_at: string;
  updated_at: string;
  // Present on the single-place GET (edit-load); absent on the list endpoint.
  media?: PlaceMediaItem[];
  // Owner-editable place metadata, returned by the single-place GET so the
  // edit form can pre-fill. null/absent season = year-round.
  contacts?: PlaceContacts;
  hours?: PlaceHoursEntry[];
  season?: "summer" | "winter" | null;
  // Action tags, single-place GET only. Drives the form's action picker on edit.
  actions?: PlaceActionTag[];
}

interface PlacesResponse {
  data: PlaceRow[];
  nextCursor: string | null;
}

function authHeader(jwt: string): Record<string, string> {
  return { Authorization: `Bearer ${jwt}` };
}

export function usePlaces() {
  const jwt = useOwnerJwt();
  return useQuery<PlacesResponse>({
    queryKey: PLACES_KEY,
    enabled: !!jwt,
    queryFn: async () => {
      const res = await fetch("/v1/admin/places?include_archived=true&limit=200", {
        headers: authHeader(jwt!),
      });
      if (!res.ok) throw new Error(`places list ${res.status}`);
      return res.json() as Promise<PlacesResponse>;
    },
  });
}

export function usePlace(id: string) {
  const jwt = useOwnerJwt();
  return useQuery<PlaceRow>({
    queryKey: [...PLACES_KEY, id],
    enabled: !!jwt && !!id,
    queryFn: async () => {
      const res = await fetch(`/v1/admin/places/${id}`, { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`place fetch ${res.status}`);
      return res.json() as Promise<PlaceRow>;
    },
  });
}

/**
 * The action/wish taxonomy backing the form's picker. Served from the DB rather than
 * hardcoded so a seed change can't silently desync the picker from the slugs the
 * write path validates against. Reference data — cached for the session.
 */
export function useActionTaxonomy() {
  const jwt = useOwnerJwt();
  return useQuery<ActionTaxonomyEntry[]>({
    queryKey: ["admin", "actions"],
    enabled: !!jwt,
    staleTime: Infinity,
    queryFn: async () => {
      const res = await fetch("/v1/admin/actions", { headers: authHeader(jwt!) });
      if (!res.ok) throw new Error(`actions fetch ${res.status}`);
      const body = (await res.json()) as { data: ActionTaxonomyEntry[] };
      return body.data;
    },
  });
}

export function useCreatePlace() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => {
      const res = await fetch("/v1/admin/places", {
        method: "POST",
        headers: { ...authHeader(jwt!), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await requestError(res, "create place");
      return res.json() as unknown;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PLACES_KEY }),
  });
}

export function useUpdatePlace(id: string) {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => {
      const res = await fetch(`/v1/admin/places/${id}`, {
        method: "PATCH",
        headers: { ...authHeader(jwt!), "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      // Carries the server's own `{error}` — notably `place_archived`, which
      // an owner hits by saving an archived place without restoring it (#376).
      // A bare "update place 409" told them nothing they could act on.
      if (!res.ok) throw await requestError(res, "update place");
      return res.json() as unknown;
    },
    // T-8.2.5 — optimistic: the pick toggle (and any inline PATCH) reflects in the
    // list cache immediately so it feels instant on a weak connection, then rolls
    // back if the server rejects. onSettled reconciles with the server either way.
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: PLACES_KEY });
      const previous = qc.getQueryData<PlacesResponse>(PLACES_KEY);
      qc.setQueryData<PlacesResponse>(PLACES_KEY, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((p) =>
                p.id === id ? { ...p, ...(body as Partial<PlaceRow>) } : p,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _body, ctx) => {
      if (ctx?.previous) qc.setQueryData(PLACES_KEY, ctx.previous);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: PLACES_KEY }),
  });
}

export function useArchivePlace() {
  const jwt = useOwnerJwt();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/v1/admin/places/${id}`, {
        method: "DELETE",
        headers: authHeader(jwt!),
      });
      if (!res.ok && res.status !== 204) throw await requestError(res, "archive place");
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: PLACES_KEY }),
  });
}
