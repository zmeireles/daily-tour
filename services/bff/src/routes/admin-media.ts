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
  fastify.post(
    "/v1/admin/media/sign",
    { config: { auth: "owner" } },
    async (req, reply) => {
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
    },
  );

  fastify.post(
    "/v1/admin/media/complete",
    { config: { auth: "owner" } },
    async (req, reply) => {
      const parsed = CompleteBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_failed", details: parsed.error.issues });
      }
      await fastify.mediaSvc.completeUpload(parsed.data.asset_id);
      return reply.code(204).send();
    },
  );
};

export default adminMediaRoute;
