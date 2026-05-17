import type { FastifyInstance } from "fastify";
import { eq, ne, and, lt, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import {
  placeTable,
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

const CreatePlaceBodySchema = z.object({
  guesthouse_scope: GuesthouseScopeSchema,
  name: I18nSchema,
  description: I18nSchema,
  geom_lat: z.number().min(-90).max(90),
  geom_lng: z.number().min(-180).max(180),
  address: z.string().min(1),
  contacts: ContactsSchema,
  hours: HoursSchema,
  status: PlaceStatusSchema.default("draft"),
  is_hosts_pick: z.boolean().default(false),
  source_kind: SourceKindSchema,
  source_ref: z.string().optional(),
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

function encodeCursor(updatedAt: string, id: string): string {
  return Buffer.from(`${updatedAt}:::${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { updatedAt: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const sepIdx = raw.indexOf(":::");
    if (sepIdx === -1) return null;
    return { updatedAt: raw.slice(0, sepIdx), id: raw.slice(sepIdx + 3) };
  } catch {
    return null;
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
          lt(placeTable.updatedAt, decoded.updatedAt),
          and(eq(placeTable.updatedAt, decoded.updatedAt), lt(placeTable.id, decoded.id)),
        ),
      );
    }

    const rows = await db
      .select()
      .from(placeTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${placeTable.updatedAt} DESC, ${placeTable.id} DESC`)
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const data = rows.slice(0, limit).map(formatPlace);
    const lastRow = data[data.length - 1];
    const nextCursor = hasNext && lastRow ? encodeCursor(lastRow.updated_at, lastRow.id) : null;

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

    return formatPlace(row);
  });

  // POST /v1/places
  app.post("/v1/places", async (req, reply) => {
    const parsed = CreatePlaceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const body = parsed.data;

    const db = getDb();
    try {
      const [created] = await db
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
          status: body.status,
          isHostsPick: body.is_hosts_pick,
          sourceKind: body.source_kind,
          sourceRef: body.source_ref,
        })
        .returning();

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

    if (!existing || existing.status === "archived") {
      return reply.code(404).send({ error: "place_not_found" });
    }

    const updates = bodyParsed.data;
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
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.is_hosts_pick !== undefined) patch.isHostsPick = updates.is_hosts_pick;
    if (updates.source_ref !== undefined) patch.sourceRef = updates.source_ref;

    const [updated] = await db
      .update(placeTable)
      .set(patch)
      .where(eq(placeTable.id, paramsParsed.data.id))
      .returning();

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
