import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";

const ParamsSchema = z.object({ id: z.string().uuid() });

// dt-tests #37 — the widths the transcode worker actually produces
// (services/media-svc/src/workers/transcode.ts SIZES). An arbitrary `?w=` is
// NOT honoured: only these have a stored derivative, and anything else falls
// through to the original rather than inventing a variant name that cannot exist.
const VARIANT_WIDTHS = [200, 600, 1200] as const;

const QuerySchema = z.object({
  w: z.coerce.number().int().optional(),
});

/**
 * Pick the stored variant that best serves this request, or undefined to serve
 * the original.
 *
 * Format comes from the browser's own Accept header rather than a query param:
 * the client should not have to know which codecs it supports twice, and a
 * `<img srcset>` cannot vary the URL by format anyway. AVIF is preferred over
 * WebP when both are offered — it is the smaller of the two at equal quality,
 * and both are already transcoded, so preferring it costs nothing.
 */
export function pickVariant(
  width: number | undefined,
  accept: string | undefined,
): string | undefined {
  if (width === undefined) return undefined;
  // Round UP to the smallest stored width that covers the request, so an image
  // is never upscaled. A request beyond the largest derivative gets the
  // original, which is the highest fidelity available.
  const stored = VARIANT_WIDTHS.find((w) => w >= width);
  if (stored === undefined) return undefined;

  const a = accept ?? "";
  const fmt = a.includes("image/avif") ? "avif" : a.includes("image/webp") ? "webp" : undefined;
  // No modern format offered → the original JPEG/PNG is the correct answer;
  // serving AVIF to a browser that did not ask for it would render nothing.
  if (fmt === undefined) return undefined;

  return `${stored}w_${fmt}`;
}

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

    const query = QuerySchema.safeParse(req.query);
    const variant = pickVariant(query.success ? query.data.w : undefined, req.headers.accept);

    const asset = await fastify.mediaSvc.fetchAsset(parsed.data.id, variant);
    if (!asset.ok || !asset.body) {
      return reply.code(asset.status === 404 ? 404 : 502).send({ error: "asset_unavailable" });
    }

    return (
      reply
        .header("content-type", asset.contentType ?? "application/octet-stream")
        .header("cache-control", "public, max-age=300")
        // The chosen representation depends on Accept, so a shared cache must not
        // hand an AVIF to a client that cannot decode it.
        .header("vary", "accept")
        .send(Buffer.from(asset.body))
    );
  });
};

export default mediaDisplayRoute;
