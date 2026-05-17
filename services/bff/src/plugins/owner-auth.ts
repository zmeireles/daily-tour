import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import {
  type FlattenedJWSInput,
  type GetKeyFunction,
  type JWSHeaderParameters,
  type JWTPayload,
  createRemoteJWKSet,
  jwtVerify,
} from "jose";
import { loadConfig } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticateOwner: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

type JwksResolver = GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput>;

interface OwnerAuthPluginOptions {
  // Test seam: injecting a JWKS resolver (typically from
  // jose.createLocalJWKSet) lets tests verify against a local RS256 keypair
  // without spinning up an Authentik instance. Production code path leaves
  // this undefined and the plugin builds the real resolver from
  // AUTHENTIK_JWKS_URL via createRemoteJWKSet.
  jwks?: JwksResolver;
}

// Owner-route auth: RS256 + Authentik JWKS, with audience check satisfied
// by either `aud: <expected>` or membership in `groups: [..., <expected>, ...]`.
// Authentik puts the group claim in `groups` when the staff-only scope
// mapping fires (see infra/authentik/blueprints/owner-app.yaml); some
// deployments map it to `aud` instead — accepting either keeps the BFF
// resilient to a blueprint-side tweak.
//
// Status-code semantics:
//   401 — no token, malformed, bad signature, expired, or unreachable JWKS.
//   403 — signature valid but the principal lacks the expected audience.
// 401 vs 403 matters because PWA `/admin/callback` retries auth on 401
// (refresh / re-login) but on 403 surfaces "not a staff member" to the user.
//
// @fastify/jwt v10 has no native JWKS, so we go to `jose` directly rather
// than wrap a second @fastify/jwt namespace around a custom Secret callback.
// `jose` is already a dep (used by the existing test fixtures) and exposes
// the 401/403 distinction cleanly via separate try/catches.
function ownerAuthPlugin(
  fastify: FastifyInstance,
  opts: OwnerAuthPluginOptions,
  done: (err?: Error) => void,
): void {
  const config = loadConfig();
  const jwks = opts.jwks ?? createRemoteJWKSet(new URL(config.AUTHENTIK_JWKS_URL));
  const expectedAudience = config.AUTHENTIK_OWNER_AUDIENCE;

  fastify.decorate(
    "authenticateOwner",
    async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        await reply.code(401).send({ error: "unauthorized" });
        return;
      }
      const token = header.slice("Bearer ".length).trim();
      if (!token) {
        await reply.code(401).send({ error: "unauthorized" });
        return;
      }

      let payload: JWTPayload;
      try {
        ({ payload } = await jwtVerify(token, jwks));
      } catch {
        await reply.code(401).send({ error: "unauthorized" });
        return;
      }

      const audClaim = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
      const groupsClaim = Array.isArray((payload as { groups?: unknown }).groups)
        ? (payload as { groups: unknown[] }).groups.filter(
            (g): g is string => typeof g === "string",
          )
        : [];

      if (![...audClaim, ...groupsClaim].includes(expectedAudience)) {
        await reply.code(403).send({ error: "wrong_audience" });
        return;
      }

      // Attach the verified payload to req.user the same way @fastify/jwt
      // does for the guest path — downstream handlers can read req.user.sub,
      // req.user.email, req.user.groups without re-decoding the token.
      (req as FastifyRequest & { user: JWTPayload }).user = payload;
    },
  );
  done();
}

export default fp(ownerAuthPlugin, { name: "bff-owner-auth" });
