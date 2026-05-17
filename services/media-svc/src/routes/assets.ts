import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { assetTable } from "../schema.js";
import { getS3Client, getPresignedGetUrl } from "../lib/s3.js";
import { loadConfig } from "../config.js";

export function assetsRoutes(app: FastifyInstance): void {
  // Public: the pre-signed GET URL is the access control mechanism.
  // Time-limited (15 min) so URL leaks are bounded. No auth header required.
  app.get("/v1/assets/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { MINIO_BUCKET } = loadConfig();

    const [asset] = await getDb().select().from(assetTable).where(eq(assetTable.id, id)).limit(1);

    if (!asset) {
      return reply.code(404).send({ error: "asset not found" });
    }

    const getUrl = await getPresignedGetUrl(getS3Client(), MINIO_BUCKET, asset.bucketKey);
    return reply.code(302).header("Location", getUrl).send();
  });
}
