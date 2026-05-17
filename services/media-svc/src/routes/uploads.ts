import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "../db.js";
import { assetTable } from "../schema.js";
import { getS3Client, getPresignedPutUrl } from "../lib/s3.js";
import { loadConfig } from "../config.js";

const ALLOWED_MIMES = new Set(["image/jpeg", "image/webp", "video/mp4"]);
const MAX_BYTES = 50 * 1024 * 1024; // 52_428_800

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

const SignBodySchema = z.object({
  mime_type: z.string(),
  size_bytes: z.number().int().positive(),
});

export function uploadsRoutes(app: FastifyInstance): void {
  app.post("/v1/uploads/sign", { preHandler: [app.verifyInternal] }, async (req, reply) => {
    const ownerId = req.headers["x-owner-id"] as string | undefined;
    if (!ownerId) {
      return reply.code(400).send({ error: "x-owner-id header is required" });
    }

    const parse = SignBodySchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "invalid body", details: parse.error.issues });
    }
    const { mime_type, size_bytes } = parse.data;

    if (!ALLOWED_MIMES.has(mime_type)) {
      return reply.code(400).send({ error: "unsupported mime_type", allowed: [...ALLOWED_MIMES] });
    }

    if (size_bytes > MAX_BYTES) {
      return reply.code(400).send({ error: "size_bytes exceeds 50 MB limit" });
    }

    const { MINIO_BUCKET } = loadConfig();
    const assetId = randomUUID();
    const ext = MIME_TO_EXT[mime_type]!;
    const bucketKey = `${ownerId}/${assetId}.${ext}`;

    const s3 = getS3Client();
    const putUrl = await getPresignedPutUrl(s3, MINIO_BUCKET, bucketKey, mime_type);

    await getDb().insert(assetTable).values({
      id: assetId,
      ownerId,
      bucketKey,
      mimeType: mime_type,
      sizeBytes: size_bytes,
    });

    return reply.code(201).send({ put_url: putUrl, asset_id: assetId });
  });
}
