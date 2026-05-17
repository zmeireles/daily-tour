import type { FastifyInstance } from "fastify";
import { and, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { guesthouseTable, type Guesthouse } from "../db/schema.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

const I18nSchema = z.record(z.string(), z.string()).refine((v) => Object.keys(v).length > 0, {
  message: "must have at least one locale entry",
});

const CreateGuesthouseBodySchema = z.object({
  owner_id: z.string().uuid(),
  name: I18nSchema,
  slug: z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "lowercase kebab-case slug"),
  address: z.string().min(1),
  geom_lat: z.number().min(-90).max(90),
  geom_lng: z.number().min(-180).max(180),
  media: z.array(z.string().uuid()).default([]),
});

const UpdateGuesthouseBodySchema = CreateGuesthouseBodySchema.partial();

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  slug: z.string().optional(),
});

const IdParamSchema = z.object({ id: z.string().uuid() });

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

function formatGuesthouse(row: Guesthouse) {
  return {
    id: row.id,
    owner_id: row.ownerId,
    name: row.name,
    slug: row.slug,
    address: row.address,
    geom_lat: row.geomLat,
    geom_lng: row.geomLng,
    media: row.media,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
  };
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

// ── Routes ────────────────────────────────────────────────────────────────────

export function guesthousesRoutes(app: FastifyInstance): void {
  // GET /v1/guesthouses
  app.get("/v1/guesthouses", async (req, reply) => {
    const parsed = ListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const { limit, cursor, slug } = parsed.data;

    const db = getDb();
    const conditions = [];
    if (slug) conditions.push(eq(guesthouseTable.slug, slug));
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) return reply.code(400).send({ error: "invalid_cursor" });
      conditions.push(
        or(
          lt(guesthouseTable.updatedAt, decoded.updatedAt),
          and(eq(guesthouseTable.updatedAt, decoded.updatedAt), lt(guesthouseTable.id, decoded.id)),
        ),
      );
    }

    const rows = await db
      .select()
      .from(guesthouseTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${guesthouseTable.updatedAt} DESC, ${guesthouseTable.id} DESC`)
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const data = rows.slice(0, limit).map(formatGuesthouse);
    const lastRow = data[data.length - 1];
    const nextCursor = hasNext && lastRow ? encodeCursor(lastRow.updated_at, lastRow.id) : null;

    return { data, nextCursor };
  });

  // GET /v1/guesthouses/:id
  app.get("/v1/guesthouses/:id", async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(guesthouseTable)
      .where(eq(guesthouseTable.id, parsed.data.id))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "guesthouse_not_found" });
    return formatGuesthouse(row);
  });

  // POST /v1/guesthouses
  app.post("/v1/guesthouses", async (req, reply) => {
    const parsed = CreateGuesthouseBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const body = parsed.data;
    const db = getDb();
    try {
      const [created] = await db
        .insert(guesthouseTable)
        .values({
          ownerId: body.owner_id,
          name: body.name,
          slug: body.slug,
          address: body.address,
          geomLat: body.geom_lat,
          geomLng: body.geom_lng,
          media: body.media,
        })
        .returning();
      if (!created) return reply.code(500).send({ error: "insert_failed" });
      void reply.header("Location", `/v1/guesthouses/${created.id}`);
      return reply.code(201).send(formatGuesthouse(created));
    } catch (err: unknown) {
      if (isUniqueViolation(err)) return reply.code(409).send({ error: "conflict" });
      throw err;
    }
  });

  // PATCH /v1/guesthouses/:id
  app.patch("/v1/guesthouses/:id", async (req, reply) => {
    const paramsParsed = IdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_failed", details: paramsParsed.error.issues });
    }
    const bodyParsed = UpdateGuesthouseBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: bodyParsed.error.issues });
    }
    const db = getDb();
    const updates = bodyParsed.data;
    const patch: Partial<typeof guesthouseTable.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.owner_id !== undefined) patch.ownerId = updates.owner_id;
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.slug !== undefined) patch.slug = updates.slug;
    if (updates.address !== undefined) patch.address = updates.address;
    if (updates.geom_lat !== undefined) patch.geomLat = updates.geom_lat;
    if (updates.geom_lng !== undefined) patch.geomLng = updates.geom_lng;
    if (updates.media !== undefined) patch.media = updates.media;

    try {
      const [updated] = await db
        .update(guesthouseTable)
        .set(patch)
        .where(eq(guesthouseTable.id, paramsParsed.data.id))
        .returning();
      if (!updated) return reply.code(404).send({ error: "guesthouse_not_found" });
      return formatGuesthouse(updated);
    } catch (err: unknown) {
      if (isUniqueViolation(err)) return reply.code(409).send({ error: "conflict" });
      throw err;
    }
  });

  // DELETE /v1/guesthouses/:id — HARD delete (no status column on this table).
  // Phase 1 design choice: guesthouses are rarely deleted; when they are, hard
  // is fine. T-1.4.x owner CRUD slice may revisit and add soft-delete via a
  // status migration if needed.
  app.delete("/v1/guesthouses/:id", async (req, reply) => {
    const parsed = IdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const db = getDb();
    await db.delete(guesthouseTable).where(eq(guesthouseTable.id, parsed.data.id));
    // Idempotent — return 204 whether or not the row existed.
    return reply.code(204).send();
  });
}
