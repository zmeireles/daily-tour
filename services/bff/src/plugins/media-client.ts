import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";

export interface MediaSignResult {
  put_url: string;
  asset_id: string;
}

export interface MediaSvc {
  // Request a pre-signed PUT URL for a direct client → MinIO upload.
  // ownerId: Authentik subject (stub: forwarded from BFF session until T-1.6.x).
  signUpload(ownerId: string, mimeType: string, sizeBytes: number): Promise<MediaSignResult>;
  // Called after the client's PUT to MinIO succeeds; triggers the transcode worker.
  completeUpload(assetId: string): Promise<void>;
}

declare module "fastify" {
  interface FastifyInstance {
    mediaSvc: MediaSvc;
  }
}

function mediaSvcPlugin(fastify: FastifyInstance, _opts: object, done: () => void): void {
  const { MEDIA_SVC_URL, MEDIA_SVC_INTERNAL_TOKEN } = loadConfig();

  fastify.decorate("mediaSvc", {
    async signUpload(
      ownerId: string,
      mimeType: string,
      sizeBytes: number,
    ): Promise<MediaSignResult> {
      const res = await fetch(`${MEDIA_SVC_URL}/v1/uploads/sign`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token": MEDIA_SVC_INTERNAL_TOKEN,
          "x-owner-id": ownerId,
        },
        body: JSON.stringify({ mime_type: mimeType, size_bytes: sizeBytes }),
      });
      if (!res.ok) {
        throw new Error(`media-svc responded ${res.status}`);
      }
      return res.json() as Promise<MediaSignResult>;
    },

    async completeUpload(assetId: string): Promise<void> {
      const res = await fetch(`${MEDIA_SVC_URL}/v1/uploads/complete`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token": MEDIA_SVC_INTERNAL_TOKEN,
        },
        body: JSON.stringify({ asset_id: assetId }),
      });
      if (!res.ok) {
        throw new Error(`media-svc /complete responded ${res.status}`);
      }
    },
  });
  done();
}

export default fp(mediaSvcPlugin, { name: "bff-media-svc" });
