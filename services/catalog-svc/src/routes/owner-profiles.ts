import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { ownerProfileTable, type OwnerProfile } from "../db/schema.js";

// ── Schemas ───────────────────────────────────────────────────────────────────

const I18nSchema = z.record(z.string(), z.string());

const DmChannelsSchema = z.object({
  in_app: z.boolean(),
  telegram: z.boolean(),
  whatsapp_link: z.boolean(),
  whatsapp_cloud: z.boolean(),
});

// PK = owner_id (the caller provides it). POST is upsert semantics.
const UpsertOwnerProfileBodySchema = z.object({
  owner_id: z.string().uuid(),
  bio: I18nSchema.optional(),
  photo: z.string().uuid().optional(),
  phone: z.string().max(32).optional(),
  call_enabled: z.boolean().default(false),
  dm_channels: DmChannelsSchema,
  email: z.string().email().optional(),
});

const UpdateOwnerProfileBodySchema = UpsertOwnerProfileBodySchema.partial().omit({
  owner_id: true,
});

const OwnerIdParamSchema = z.object({ owner_id: z.string().uuid() });

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatOwnerProfile(row: OwnerProfile) {
  return {
    owner_id: row.ownerId,
    bio: row.bio,
    photo: row.photo,
    phone: row.phone,
    call_enabled: row.callEnabled,
    dm_channels: row.dmChannels,
    email: row.email,
    updated_at: row.updatedAt,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export function ownerProfilesRoutes(app: FastifyInstance): void {
  // GET /v1/owner-profiles/:owner_id
  app.get("/v1/owner-profiles/:owner_id", async (req, reply) => {
    const parsed = OwnerIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const db = getDb();
    const [row] = await db
      .select()
      .from(ownerProfileTable)
      .where(eq(ownerProfileTable.ownerId, parsed.data.owner_id))
      .limit(1);
    if (!row) return reply.code(404).send({ error: "owner_profile_not_found" });
    return formatOwnerProfile(row);
  });

  // POST /v1/owner-profiles — upsert (idempotent on owner_id PK).
  // If owner_id exists, behaves like PATCH and returns 200. Otherwise 201.
  app.post("/v1/owner-profiles", async (req, reply) => {
    const parsed = UpsertOwnerProfileBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const body = parsed.data;
    const db = getDb();

    const [existing] = await db
      .select()
      .from(ownerProfileTable)
      .where(eq(ownerProfileTable.ownerId, body.owner_id))
      .limit(1);

    const values = {
      ownerId: body.owner_id,
      bio: body.bio,
      photo: body.photo,
      phone: body.phone,
      callEnabled: body.call_enabled,
      dmChannels: body.dm_channels,
      email: body.email,
      updatedAt: new Date().toISOString(),
    };

    if (existing) {
      const [updated] = await db
        .update(ownerProfileTable)
        .set(values)
        .where(eq(ownerProfileTable.ownerId, body.owner_id))
        .returning();
      return reply.code(200).send(formatOwnerProfile(updated!));
    }

    const [created] = await db.insert(ownerProfileTable).values(values).returning();
    void reply.header("Location", `/v1/owner-profiles/${created!.ownerId}`);
    return reply.code(201).send(formatOwnerProfile(created!));
  });

  // PATCH /v1/owner-profiles/:owner_id
  app.patch("/v1/owner-profiles/:owner_id", async (req, reply) => {
    const paramsParsed = OwnerIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return reply
        .code(400)
        .send({ error: "validation_failed", details: paramsParsed.error.issues });
    }
    const bodyParsed = UpdateOwnerProfileBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: bodyParsed.error.issues });
    }
    const db = getDb();
    const updates = bodyParsed.data;
    const patch: Partial<typeof ownerProfileTable.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.bio !== undefined) patch.bio = updates.bio;
    if (updates.photo !== undefined) patch.photo = updates.photo;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.call_enabled !== undefined) patch.callEnabled = updates.call_enabled;
    if (updates.dm_channels !== undefined) patch.dmChannels = updates.dm_channels;
    if (updates.email !== undefined) patch.email = updates.email;

    const [updated] = await db
      .update(ownerProfileTable)
      .set(patch)
      .where(eq(ownerProfileTable.ownerId, paramsParsed.data.owner_id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "owner_profile_not_found" });
    return formatOwnerProfile(updated);
  });

  // DELETE /v1/owner-profiles/:owner_id — hard delete (no status column).
  app.delete("/v1/owner-profiles/:owner_id", async (req, reply) => {
    const parsed = OwnerIdParamSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const db = getDb();
    await db.delete(ownerProfileTable).where(eq(ownerProfileTable.ownerId, parsed.data.owner_id));
    return reply.code(204).send();
  });
}
