import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../db.js";
import { assetTable } from "../schema.js";
import { getS3Client, getPresignedGetUrl } from "../lib/s3.js";
import { loadConfig } from "../config.js";

export function assetsRoutes(app: FastifyInstance): void {
  // NOT public. The presigned GET URL this returns is time-limited (15 min),
  // which bounds a leak — it does not decide who may ask for one. The BFF is
  // the only caller (media-client.fetchAsset, behind routes/media-display.ts);
  // media-svc has no Traefik router and publishes no port, so browsers never
  // reach it. The service-wide gate in plugins/internal-auth.ts covers this
  // route: without X-Internal-Token it is 401 before the handler runs.
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
