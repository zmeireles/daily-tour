import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";

const ParamsSchema = z.object({ id: z.string().uuid() });

// Public media-display proxy (T-6.C.0 / media foundation). Serves an asset's
// bytes same-origin so an `<img src="/v1/media/:id">` works in the browser:
// media-svc only 302-redirects to a MinIO presigned URL on the internal
// `minio:9000` host, which the browser cannot reach. The BFF follows that
// redirect server-side (see media-client.fetchAsset) and streams the bytes.
//
// Public by design: images are display assets shown to guests (place heroes,
// owner avatars), and `<img>` cannot carry an auth header. Asset ids are
// unguessable UUIDs; access control is the same posture as media-svc's own
// presigned-URL contract.
// eslint-disable-next-line @typescript-eslint/require-await
const mediaDisplayRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/v1/media/:id", { config: { auth: "public" } }, async (req, reply) => {
    const parsed = ParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_asset_id" });
    }

    const asset = await fastify.mediaSvc.fetchAsset(parsed.data.id);
    if (!asset.ok || !asset.body) {
      return reply.code(asset.status === 404 ? 404 : 502).send({ error: "asset_unavailable" });
    }

    return reply
      .header("content-type", asset.contentType ?? "application/octet-stream")
      .header("cache-control", "public, max-age=300")
      .send(Buffer.from(asset.body));
  });
};

export default mediaDisplayRoute;
