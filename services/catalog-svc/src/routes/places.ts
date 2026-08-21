import type { FastifyInstance } from "fastify";
import { eq, ne, and, lt, or, sql, inArray, asc, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb, type Db } from "../db/client.js";
import {
  placeTable,
  placeMediaTable,
  placeActionWishTable,
  actionTable,
  wishTable,
  type Place,
} from "../db/schema.js";

// ── Schema ────────────────────────────────────────────────────────────────────

const GuesthouseScopeSchema = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ guesthouse_ids: z.array(z.string().uuid()) }),
]);

const I18nSchema = z.record(z.string(), z.string()).refine((v) => Object.keys(v).length > 0, {
  message: "must have at least one locale entry",
});

const PlaceStatusSchema = z.enum(["draft", "owner_approved", "published", "archived"]);

const SourceKindSchema = z.enum(["manual", "google_places", "osm", "crawl"]);

const ContactsSchema = z
  .object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    social: z.array(z.object({ kind: z.string(), handle: z.string() })).default([]),
  })
  .default({});

const HoursSchema = z
  .array(
    z.object({
      dow: z.number().int().min(0).max(6),
      open: z.string().regex(/^\d{2}:\d{2}$/),
      close: z.string().regex(/^\d{2}:\d{2}$/),
    }),
  )
  .default([]);

// Action tagging. Discovery reaches a place only through place_action_wish, and that
// join carries a NOT NULL wish_id — an action with no wish cannot be represented at
// all. Required on create (min 1 action, min 1 wish each): a place with no rows is
// invisible to every guest surface, which is exactly the defect this closes.
const PlaceActionsSchema = z
  .array(
    z.object({
      action_slug: z.string().min(1).max(64),
      wish_slugs: z.array(z.string().min(1).max(64)).min(1),
    }),
  )
  .min(1);

const CreatePlaceBodySchema = z.object({
  actions: PlaceActionsSchema,
  guesthouse_scope: GuesthouseScopeSchema,
  name: I18nSchema,
  description: I18nSchema,
  geom_lat: z.number().min(-90).max(90),
  geom_lng: z.number().min(-180).max(180),
  address: z.string().min(1),
  contacts: ContactsSchema,
  hours: HoursSchema,
  season: z.enum(["summer", "winter"]).nullable().optional(),
  status: PlaceStatusSchema.default("draft"),
  is_hosts_pick: z.boolean().default(false),
  source_kind: SourceKindSchema,
  source_ref: z.string().optional(),
  // Ids of the place's photos, IN DISPLAY ORDER. Deliberately `.optional()`
  // and not `.default([])`: after `.partial()` below a defaulted field's
  // behaviour on an absent key is a zod detail, and guessing it wrong here
  // means every PATCH that omits media wipes the place's photos. Absent must
  // mean "leave alone", and that has to be unmistakable.
  media: z.array(z.string().uuid()).optional(),
});

const UpdatePlaceBodySchema = CreatePlaceBodySchema.partial().omit({ source_kind: true });

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  status: PlaceStatusSchema.optional(),
  guesthouse_scope_id: z.string().uuid().optional(),
  include_archived: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

const PlacesByActionQuerySchema = z.object({
  action_slug: z.string().min(1).max(64),
  status: PlaceStatusSchema.optional().default("published"),
});

const IdParamSchema = z.object({ id: z.string().uuid() });

const GetQuerySchema = z.object({
  include_archived: z
    .string()
    .transform((v) => v === "true")
    .optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

type PlaceActionsInput = z.infer<typeof PlaceActionsSchema>;
type ActionWishPair = { actionId: string; wishId: string };

/**
 * Resolve {action_slug, wish_slugs[]} pairs into concrete place_action_wish rows.
 *
 * Wish slugs are unique only *within* an action ("sea-view" exists under both Eat and
 * Drink), so each wish is looked up against its own action rather than globally.
 * Returns the offending slugs instead of throwing so the caller can reject the whole
 * request — a partially-applied tag set would silently under-expose the place. Resolves
 * ahead of any write so an unknown slug never leaves an untagged place behind.
 */
async function resolveActionWishPairs(
  db: Db,
  actions: PlaceActionsInput,
): Promise<{ pairs: ActionWishPair[] } | { unknown: string[] }> {
  const rows = await db
    .select({
      actionId: actionTable.id,
      actionSlug: actionTable.slug,
      wishId: wishTable.id,
      wishSlug: wishTable.slug,
    })
    .from(actionTable)
    .leftJoin(wishTable, eq(wishTable.actionId, actionTable.id))
    .where(
      inArray(
        actionTable.slug,
        actions.map((a) => a.action_slug),
      ),
    );

  const byAction = new Map<string, { id: string; wishes: Map<string, string> }>();
  for (const row of rows) {
    let entry = byAction.get(row.actionSlug);
    if (!entry) {
      entry = { id: row.actionId, wishes: new Map() };
      byAction.set(row.actionSlug, entry);
    }
    // leftJoin yields a null wish row for an action that has no wishes seeded.
    if (row.wishSlug !== null && row.wishId !== null) entry.wishes.set(row.wishSlug, row.wishId);
  }

  const unknown: string[] = [];
  // Set-dedupe: the composite PK (place, action, wish) rejects duplicates, and a
  // client repeating a pair should not turn into a 409.
  const seen = new Set<string>();
  const resolved: ActionWishPair[] = [];

  for (const action of actions) {
    const entry = byAction.get(action.action_slug);
    if (!entry) {
      unknown.push(`action:${action.action_slug}`);
      continue;
    }
    for (const wishSlug of action.wish_slugs) {
      const wishId = entry.wishes.get(wishSlug);
      if (!wishId) {
        unknown.push(`wish:${action.action_slug}/${wishSlug}`);
        continue;
      }
      const key = `${entry.id}:${wishId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push({ actionId: entry.id, wishId });
    }
  }

  return unknown.length > 0 ? { unknown } : { pairs: resolved };
}

// Keyset cursor on createdAt (immutable) — NOT updatedAt. Ordering by updatedAt
// would reshuffle the list on every PATCH (e.g. a host's-pick toggle bumps
// updated_at and jumps the row to the top). createdAt is set once at insert.
function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}:::${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sepIdx = raw.indexOf(":::");
    if (sepIdx === -1) return null;
    return { createdAt: raw.slice(0, sepIdx), id: raw.slice(sepIdx + 3) };
  } catch {
    return null;
  }
}

// Media for a single place, in display (sort_order) order. Kept separate from
// formatPlace so list/POST/PATCH responses don't trigger a per-row media query.
/**
 * A place's action tags, shaped exactly like the write contract so the owner form can
 * round-trip read → edit → save without a translation layer. Single-place read only —
 * deliberately not folded into the list query, which would make it N+1.
 */
async function fetchPlaceActions(db: Db, placeId: string): Promise<PlaceActionsInput> {
  const rows = await db
    .select({ actionSlug: actionTable.slug, wishSlug: wishTable.slug })
    .from(placeActionWishTable)
    .innerJoin(actionTable, eq(placeActionWishTable.actionId, actionTable.id))
    .innerJoin(wishTable, eq(placeActionWishTable.wishId, wishTable.id))
    .where(eq(placeActionWishTable.placeId, placeId))
    .orderBy(asc(actionTable.sortOrder), asc(wishTable.sortOrder));

  const byAction = new Map<string, string[]>();
  for (const row of rows) {
    const wishes = byAction.get(row.actionSlug);
    if (wishes) wishes.push(row.wishSlug);
    else byAction.set(row.actionSlug, [row.wishSlug]);
  }
  return [...byAction.entries()].map(([action_slug, wish_slugs]) => ({ action_slug, wish_slugs }));
}

async function fetchPlaceMedia(db: Db, placeId: string) {
  const rows = await db
    .select({
      id: placeMediaTable.id,
      kind: placeMediaTable.kind,
      url: placeMediaTable.url,
      alt: placeMediaTable.alt,
      attribution: placeMediaTable.attribution,
      sortOrder: placeMediaTable.sortOrder,
    })
    .from(placeMediaTable)
    .where(eq(placeMediaTable.placeId, placeId))
    .orderBy(placeMediaTable.sortOrder);
  return rows.map((m) => ({
    id: m.id,
    kind: m.kind,
    url: m.url,
    alt: m.alt ?? null,
    attribution: m.attribution ?? null,
    sort_order: m.sortOrder,
  }));
}

// Owner-attached media arrives as an array of ids in display order. TWO id
// namespaces necessarily share that array: an EXISTING photo is identified by
// its `place_media.id`, because the table stores a url and never the media-svc
// asset id it came from, so the editor has nothing else to send back; a NEWLY
// uploaded photo is identified by its media-svc asset id. Resolve by lookup —
// an id matching a row of THIS place IS that row, anything else is a new asset.
//
// A surviving row is never rewritten, only re-ordered. That is what protects
// `attribution`: the Wikimedia Commons author/licence/source on the 14 seeded
// landmark photos has no other copy in the app, and the obvious
// delete-all-then-reinsert would erase it on the owner's first save. The only
// way a row leaves is the owner removing that thumbnail — the editor's own
// meaning, and their explicit act.
//
// `sort_order` is load-bearing, not cosmetic: `hero_image_url` is the lowest
// sort_order image, so the array's order chooses the place's hero.
type PlacesTx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function syncPlaceMedia(tx: PlacesTx, placeId: string, mediaIds: string[]): Promise<void> {
  const existing = await tx
    .select({ id: placeMediaTable.id })
    .from(placeMediaTable)
    .where(eq(placeMediaTable.placeId, placeId));
  const existingIds = new Set(existing.map((r) => r.id));
  const kept = new Set(mediaIds.filter((id) => existingIds.has(id)));

  const removed = existing.filter((r) => !kept.has(r.id)).map((r) => r.id);
  if (removed.length > 0) {
    await tx.delete(placeMediaTable).where(inArray(placeMediaTable.id, removed));
  }

  const inserts: (typeof placeMediaTable.$inferInsert)[] = [];
  for (const [index, id] of mediaIds.entries()) {
    if (existingIds.has(id)) {
      await tx.update(placeMediaTable).set({ sortOrder: index }).where(eq(placeMediaTable.id, id));
      continue;
    }
    inserts.push({
      placeId,
      kind: "image",
      // The BFF streams media-svc's bytes same-origin at this path (see
      // services/bff/src/routes/media-display.ts), so storing the URL keeps
      // place_media uniform with the externally-sourced seeded rows.
      url: `/v1/media/${id}`,
      sortOrder: index,
    });
  }
  if (inserts.length > 0) {
    await tx.insert(placeMediaTable).values(inserts);
  }
}

function formatPlace(row: Place) {
  return {
    id: row.id,
    guesthouse_scope: row.guesthouseScope,
    name: row.name,
    description: row.description,
    geom_lat: row.geomLat,
    geom_lng: row.geomLng,
    address: row.address,
    contacts: row.contacts,
    hours: row.hours,
    season: row.season,
    status: row.status,
    is_hosts_pick: row.isHostsPick,
    source_kind: row.sourceKind,
    source_ref: row.sourceRef,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function placesRoutes(app: FastifyInstance): void {
  // GET /v1/places
  app.get("/v1/places", async (req, reply) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { limit, cursor, status, guesthouse_scope_id, include_archived } = parsed.data;

    const db = getDb();
    const conditions: (SQL | undefined)[] = [];

    // Default: hide archived unless explicitly requested.
    if (!include_archived) {
      if (status) {
        conditions.push(eq(placeTable.status, status));
      } else {
        conditions.push(ne(placeTable.status, "archived"));
      }
    } else if (status) {
      conditions.push(eq(placeTable.status, status));
    }

    if (guesthouse_scope_id) {
      conditions.push(
        sql`(
          ${placeTable.guesthouseScope} @> '{"all":true}'::jsonb
          OR ${placeTable.guesthouseScope}->'guesthouse_ids' @> ${JSON.stringify([guesthouse_scope_id])}::jsonb
        )`,
      );
    }

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        return reply.code(400).send({ error: "invalid_cursor" });
      }
      conditions.push(
        or(
          lt(placeTable.createdAt, decoded.createdAt),
          and(eq(placeTable.createdAt, decoded.createdAt), lt(placeTable.id, decoded.id)),
        ),
      );
    }

    const rows = await db
      .select()
      .from(placeTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${placeTable.createdAt} DESC, ${placeTable.id} DESC`)
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const data = rows.slice(0, limit).map(formatPlace);
    const lastRow = data[data.length - 1];
    const nextCursor = hasNext && lastRow ? encodeCursor(lastRow.created_at, lastRow.id) : null;

    return { data, nextCursor };
  });

  // GET /v1/places/:id
  app.get("/v1/places/:id", async (req, reply) => {
    const paramsParsed = IdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_failed", details: paramsParsed.error.issues });
    }
    const queryParsed = GetQuerySchema.safeParse(req.query);
    const includeArchived = queryParsed.success ? queryParsed.data.include_archived : false;

    const db = getDb();
    const [row] = await db
      .select()
      .from(placeTable)
      .where(eq(placeTable.id, paramsParsed.data.id))
      .limit(1);

    if (!row) {
      return reply.code(404).send({ error: "place_not_found" });
    }
    if (row.status === "archived" && !includeArchived) {
      return reply.code(404).send({ error: "place_not_found" });
    }

    const [media, actions] = await Promise.all([
      fetchPlaceMedia(db, row.id),
      fetchPlaceActions(db, row.id),
    ]);
    return { ...formatPlace(row), media, actions };
  });

  // GET /v1/places/:id/hydrated — place + media + actions + wishes (joined).
  // Called by the BFF place-detail route (T-1.3.0). Single endpoint to avoid 3-4
  // round trips; mirrors the /v1/places-by-action pattern from T-1.2.0.
  app.get("/v1/places/:id/hydrated", async (req, reply) => {
    const paramsParsed = IdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_failed", details: paramsParsed.error.issues });
    }
    const { id } = paramsParsed.data;

    const db = getDb();
    const rows = await db
      .select({
        id: placeTable.id,
        guesthouseScope: placeTable.guesthouseScope,
        name: placeTable.name,
        description: placeTable.description,
        geomLat: placeTable.geomLat,
        geomLng: placeTable.geomLng,
        address: placeTable.address,
        contacts: placeTable.contacts,
        hours: placeTable.hours,
        season: placeTable.season,
        status: placeTable.status,
        isHostsPick: placeTable.isHostsPick,
        sourceKind: placeTable.sourceKind,
        sourceRef: placeTable.sourceRef,
        createdAt: placeTable.createdAt,
        updatedAt: placeTable.updatedAt,
        mediaId: placeMediaTable.id,
        mediaKind: placeMediaTable.kind,
        mediaUrl: placeMediaTable.url,
        mediaAlt: placeMediaTable.alt,
        mediaAttribution: placeMediaTable.attribution,
        mediaSortOrder: placeMediaTable.sortOrder,
        actionSlug: actionTable.slug,
        actionI18n: actionTable.i18n,
        wishSlug: wishTable.slug,
        wishI18n: wishTable.i18n,
      })
      .from(placeTable)
      .leftJoin(placeMediaTable, eq(placeMediaTable.placeId, placeTable.id))
      .leftJoin(placeActionWishTable, eq(placeActionWishTable.placeId, placeTable.id))
      .leftJoin(actionTable, eq(placeActionWishTable.actionId, actionTable.id))
      .leftJoin(wishTable, eq(placeActionWishTable.wishId, wishTable.id))
      .where(eq(placeTable.id, id));

    if (rows.length === 0) {
      return reply.code(404).send({ error: "place_not_found" });
    }

    const first = rows[0]!;
    if (first.status === "archived") {
      return reply.code(404).send({ error: "place_not_found" });
    }

    // Deduplicate the cartesian product (media × action+wish) in JS.
    const seenMedia = new Set<string>();
    const seenActions = new Set<string>();
    const seenWishes = new Set<string>();
    const media: {
      id: string;
      kind: string;
      url: string;
      alt: Record<string, string> | null;
      attribution: { author: string; license: string; source_url: string } | null;
      sort_order: number;
    }[] = [];
    const actions: { slug: string; label_i18n: Record<string, string> }[] = [];
    const wishes: { slug: string; action_slug: string; label_i18n: Record<string, string> }[] = [];

    for (const row of rows) {
      if (row.mediaId && !seenMedia.has(row.mediaId)) {
        seenMedia.add(row.mediaId);
        media.push({
          id: row.mediaId,
          kind: row.mediaKind!,
          url: row.mediaUrl!,
          alt: row.mediaAlt ?? null,
          attribution: row.mediaAttribution ?? null,
          sort_order: row.mediaSortOrder!,
        });
      }
      if (row.actionSlug && !seenActions.has(row.actionSlug)) {
        seenActions.add(row.actionSlug);
        actions.push({ slug: row.actionSlug, label_i18n: row.actionI18n! });
      }
      if (row.wishSlug && row.actionSlug) {
        const wishKey = `${row.actionSlug}::${row.wishSlug}`;
        if (!seenWishes.has(wishKey)) {
          seenWishes.add(wishKey);
          wishes.push({
            slug: row.wishSlug,
            action_slug: row.actionSlug,
            label_i18n: row.wishI18n!,
          });
        }
      }
    }

    media.sort((a, b) => a.sort_order - b.sort_order);

    return {
      id: first.id,
      guesthouse_scope: first.guesthouseScope,
      name: first.name,
      description: first.description,
      geom_lat: first.geomLat,
      geom_lng: first.geomLng,
      address: first.address,
      contacts: first.contacts,
      hours: first.hours,
      season: first.season,
      status: first.status,
      is_hosts_pick: first.isHostsPick,
      source_kind: first.sourceKind,
      source_ref: first.sourceRef,
      created_at: first.createdAt,
      updated_at: first.updatedAt,
      media,
      actions,
      wishes,
    };
  });

  // GET /v1/actions — the whole action/wish taxonomy (reference data: 6 actions,
  // ~6 wishes each). The owner place form needs it to render its picker; serving it
  // from the DB keeps the picker honest, since hardcoding slugs client-side would
  // desync from the seed and surface only as failed writes.
  app.get("/v1/actions", async () => {
    const db = getDb();
    const rows = await db
      .select({
        actionSlug: actionTable.slug,
        actionI18n: actionTable.i18n,
        actionIcon: actionTable.icon,
        wishSlug: wishTable.slug,
        wishI18n: wishTable.i18n,
      })
      .from(actionTable)
      .leftJoin(wishTable, eq(wishTable.actionId, actionTable.id))
      // Display order is authored in the seed (sort_order), not by the client.
      .orderBy(asc(actionTable.sortOrder), asc(wishTable.sortOrder));

    type ActionOut = {
      slug: string;
      label_i18n: Record<string, string>;
      icon: string;
      wishes: { slug: string; label_i18n: Record<string, string> }[];
    };

    const byAction = new Map<string, ActionOut>();
    for (const row of rows) {
      let entry = byAction.get(row.actionSlug);
      if (!entry) {
        entry = {
          slug: row.actionSlug,
          label_i18n: row.actionI18n,
          icon: row.actionIcon,
          wishes: [],
        };
        byAction.set(row.actionSlug, entry);
      }
      // An action with no seeded wishes still appears, with an empty wish list — the
      // form can then disable it rather than offer an unsatisfiable choice.
      if (row.wishSlug !== null) {
        entry.wishes.push({ slug: row.wishSlug, label_i18n: row.wishI18n! });
      }
    }

    return { data: [...byAction.values()] };
  });

  // POST /v1/places
  app.post("/v1/places", async (req, reply) => {
    const parsed = CreatePlaceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const body = parsed.data;

    // A host's pick is only meaningful for published places (guest discover hides the rest).
    if (body.is_hosts_pick && body.status !== "published") {
      return reply.code(422).send({ error: "hosts_pick_requires_published" });
    }

    const db = getDb();

    // Resolve the action/wish slugs before writing anything: an unknown slug must not
    // leave behind an untagged (i.e. undiscoverable) place.
    const resolved = await resolveActionWishPairs(db, body.actions);
    if ("unknown" in resolved) {
      return reply.code(422).send({ error: "unknown_action_or_wish", details: resolved.unknown });
    }

    try {
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(placeTable)
          .values({
            guesthouseScope: body.guesthouse_scope,
            name: body.name,
            description: body.description,
            geomLat: body.geom_lat,
            geomLng: body.geom_lng,
            address: body.address,
            contacts: body.contacts,
            hours: body.hours,
            season: body.season ?? null,
            status: body.status,
            isHostsPick: body.is_hosts_pick,
            sourceKind: body.source_kind,
            sourceRef: body.source_ref,
          })
          .returning();

        if (!row) return null;

        await tx
          .insert(placeActionWishTable)
          .values(resolved.pairs.map((p) => ({ placeId: row.id, ...p })));

        await syncPlaceMedia(tx, row.id, body.media ?? []);

        return row;
      });

      if (!created) {
        return reply.code(500).send({ error: "insert_failed" });
      }

      void reply.header("Location", `/v1/places/${created.id}`);
      return reply.code(201).send(formatPlace(created));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        return reply.code(409).send({ error: "conflict" });
      }
      throw err;
    }
  });

  // PATCH /v1/places/:id
  app.patch("/v1/places/:id", async (req, reply) => {
    const paramsParsed = IdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_failed", details: paramsParsed.error.issues });
    }
    const bodyParsed = UpdatePlaceBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: bodyParsed.error.issues });
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(placeTable)
      .where(eq(placeTable.id, paramsParsed.data.id))
      .limit(1);

    if (!existing) {
      return reply.code(404).send({ error: "place_not_found" });
    }

    const updates = bodyParsed.data;

    // An archived place stays read-only, EXCEPT for the one change that undoes
    // the archive. Blocking every PATCH — which is what a bare
    // `status === "archived"` guard did — also blocked
    // `{ status: "published" }`, so an owner who archived a place by mistake
    // had no way back from the console at all: the row, its tags, its media
    // and its coordinates all still existed, simply unreachable through the
    // write API (#376). The owner decided archiving should be reversible.
    //
    // The test is the RESULTING status, not "the body changes only status":
    // the console's form submits every field on save, so a status-only rule
    // would reject the very request the restore path sends.
    //
    // The 404 is gone from this branch on purpose. Answering "not found" for a
    // row that demonstrably exists left a caller unable to tell a bad id from
    // an archived one — the same illegibility as the opaque guesthouse 400
    // fixed in #372. An archived row that is not being restored now answers
    // 409 `place_archived`, which names the actual condition.
    if (existing.status === "archived" && (updates.status ?? "archived") === "archived") {
      return reply.code(409).send({ error: "place_archived" });
    }

    // A host's pick must stay published: reject flipping a non-published place to a pick,
    // and reject un-publishing a pick without also clearing it. Use the *resulting* values.
    const resultingStatus = updates.status ?? existing.status;
    const resultingPick = updates.is_hosts_pick ?? existing.isHostsPick;
    if (resultingPick && resultingStatus !== "published") {
      return reply.code(422).send({ error: "hosts_pick_requires_published" });
    }

    const patch: Partial<typeof placeTable.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.guesthouse_scope !== undefined) patch.guesthouseScope = updates.guesthouse_scope;
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.geom_lat !== undefined) patch.geomLat = updates.geom_lat;
    if (updates.geom_lng !== undefined) patch.geomLng = updates.geom_lng;
    if (updates.address !== undefined) patch.address = updates.address;
    if (updates.contacts !== undefined) patch.contacts = updates.contacts;
    if (updates.hours !== undefined) patch.hours = updates.hours;
    if (updates.season !== undefined) patch.season = updates.season;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.is_hosts_pick !== undefined) patch.isHostsPick = updates.is_hosts_pick;
    if (updates.source_ref !== undefined) patch.sourceRef = updates.source_ref;

    // `actions` is omitted on most PATCHes (a pick toggle, a status flip) and must be
    // left alone then. When present it REPLACES the whole tag set — the zod min(1)
    // still applies, so a place can never be patched down to zero tags and vanish
    // from discovery.
    let resolvedPairs: ActionWishPair[] | null = null;
    if (updates.actions !== undefined) {
      const resolved = await resolveActionWishPairs(db, updates.actions);
      if ("unknown" in resolved) {
        return reply.code(422).send({ error: "unknown_action_or_wish", details: resolved.unknown });
      }
      resolvedPairs = resolved.pairs;
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(placeTable)
        .set(patch)
        .where(eq(placeTable.id, paramsParsed.data.id))
        .returning();

      if (row && resolvedPairs) {
        await tx.delete(placeActionWishTable).where(eq(placeActionWishTable.placeId, row.id));
        await tx
          .insert(placeActionWishTable)
          .values(resolvedPairs.map((p) => ({ placeId: row.id, ...p })));
      }

      // Absent `media` means "leave the photos alone" — a pick toggle or a
      // status flip must not touch them. Same discipline as `actions` above.
      if (row && updates.media !== undefined) {
        await syncPlaceMedia(tx, row.id, updates.media);
      }

      return row;
    });

    return formatPlace(updated!);
  });

  // GET /v1/places-by-action — places tagged with an action, grouped with their wish slugs.
  // Called by the BFF discover aggregator (T-1.2.0). Returns a flat list of places with
  // their wish slugs for the given action, ready for BFF-side geo-filter + wish grouping.
  app.get("/v1/places-by-action", async (req, reply) => {
    const parsed = PlacesByActionQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { action_slug, status } = parsed.data;

    const db = getDb();
    const rows = await db
      .select({
        id: placeTable.id,
        name: placeTable.name,
        description: placeTable.description,
        geomLat: placeTable.geomLat,
        geomLng: placeTable.geomLng,
        address: placeTable.address,
        isHostsPick: placeTable.isHostsPick,
        status: placeTable.status,
        createdAt: placeTable.createdAt,
        wishSlug: wishTable.slug,
        heroImageUrl: sql<string | null>`(
          select pm.url from catalog.place_media pm
          where pm.place_id = ${placeTable.id} and pm.kind = 'image'
          order by pm.sort_order asc limit 1
        )`,
      })
      .from(placeTable)
      .innerJoin(placeActionWishTable, eq(placeActionWishTable.placeId, placeTable.id))
      .innerJoin(actionTable, eq(placeActionWishTable.actionId, actionTable.id))
      .innerJoin(wishTable, eq(placeActionWishTable.wishId, wishTable.id))
      .where(and(eq(actionTable.slug, action_slug), eq(placeTable.status, status)));

    type PlaceItem = {
      id: string;
      name: Record<string, string>;
      description: Record<string, string>;
      geom_lat: number;
      geom_lng: number;
      address: string;
      is_hosts_pick: boolean;
      status: string;
      created_at: string;
      wishes: string[];
      hero_image_url: string | null;
    };

    const placeMap = new Map<string, PlaceItem>();
    for (const row of rows) {
      let entry = placeMap.get(row.id);
      if (!entry) {
        entry = {
          id: row.id,
          name: row.name,
          description: row.description,
          geom_lat: row.geomLat,
          geom_lng: row.geomLng,
          address: row.address,
          is_hosts_pick: row.isHostsPick,
          status: row.status,
          created_at: row.createdAt,
          wishes: [],
          hero_image_url: row.heroImageUrl ?? null,
        };
        placeMap.set(row.id, entry);
      }
      entry.wishes.push(row.wishSlug);
    }

    return { items: [...placeMap.values()] };
  });

  // DELETE /v1/places/:id — soft-delete (idempotent)
  app.delete("/v1/places/:id", async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }

    const db = getDb();
    await db
      .update(placeTable)
      .set({ status: "archived", updatedAt: new Date().toISOString() })
      .where(and(eq(placeTable.id, parsed.data.id), ne(placeTable.status, "archived")));

    return reply.code(204).send();
  });
}

function isUniqueViolation(err: unknown): boolean {
  // drizzle wraps the underlying pg error in DrizzleQueryError, so the
  // `.code` (Postgres SQLSTATE 23505 = unique_violation) lives on
  // `.cause`. Check both shapes.
  if (typeof err !== "object" || err === null) return false;
  const direct = (err as { code?: string }).code;
  if (direct === "23505") return true;
  const cause = (err as { cause?: { code?: string } }).cause;
  return cause?.code === "23505";
}
