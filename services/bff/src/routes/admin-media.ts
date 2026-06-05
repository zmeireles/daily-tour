import type { FastifyInstance, FastifyPluginAsync, FastifyRequest } from "fastify";
import type { JWTPayload } from "jose";
import { z } from "zod";

const SignBodySchema = z.object({
  mime_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
});

const CompleteBodySchema = z.object({
  asset_id: z.string().uuid(),
});

type OwnerRequest = FastifyRequest & { user: JWTPayload };

// eslint-disable-next-line @typescript-eslint/require-await
const adminMediaRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Buffer raw image bodies so the BFF can proxy the upload to MinIO. Scoped
  // to this plugin's encapsulation context (the /v1/admin/media/* routes).
  fastify.addContentTypeParser(/^image\//, { parseAs: "buffer" }, (_req, body, done) =>
    done(null, body),
  );

  // Same-origin upload proxy: the browser POSTs raw image bytes here and the
  // BFF runs sign → PUT-to-MinIO → complete server-side. Avoids the browser
  // having to PUT to the internal `minio:9000` presigned host it can't reach.
  fastify.post("/v1/admin/media/upload", { config: { auth: "owner" } }, async (req, reply) => {
    const ownerId = (req as OwnerRequest).user.sub;
    if (!ownerId) {
      return reply.code(401).send({ error: "missing_sub" });
    }
    const mimeType = (req.headers["content-type"] ?? "").split(";")[0]?.trim() ?? "";
    if (!mimeType.startsWith("image/")) {
      return reply.code(415).send({ error: "unsupported_media_type" });
    }
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      return reply.code(400).send({ error: "empty_body" });
    }
    const result = await fastify.mediaSvc.uploadAsset(ownerId, mimeType, body);
    return reply.code(201).send(result);
  });

  fastify.post("/v1/admin/media/sign", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = SignBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    const ownerId = (req as OwnerRequest).user.sub;
    if (!ownerId) {
      return reply.code(401).send({ error: "missing_sub" });
    }
    const result = await fastify.mediaSvc.signUpload(
      ownerId,
      parsed.data.mime_type,
      parsed.data.size_bytes,
    );
    return result;
  });

  fastify.post("/v1/admin/media/complete", { config: { auth: "owner" } }, async (req, reply) => {
    const parsed = CompleteBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
    }
    await fastify.mediaSvc.completeUpload(parsed.data.asset_id);
    return reply.code(204).send();
  });
};

export default adminMediaRoute;
