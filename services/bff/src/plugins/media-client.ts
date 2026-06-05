import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { loadConfig } from "../config.js";

export interface MediaSignResult {
  put_url: string;
  asset_id: string;
}

export interface MediaAsset {
  ok: boolean;
  status: number;
  contentType: string | null;
  body: ArrayBuffer | null;
}

export interface MediaSvc {
  // Request a pre-signed PUT URL for a direct client → MinIO upload.
  // ownerId: Authentik subject (stub: forwarded from BFF session until T-1.6.x).
  signUpload(ownerId: string, mimeType: string, sizeBytes: number): Promise<MediaSignResult>;
  // Called after the client's PUT to MinIO succeeds; triggers the transcode worker.
  completeUpload(assetId: string): Promise<void>;
  // Fetch an asset's bytes for browser display. media-svc 302-redirects to a
  // short-lived MinIO presigned URL on the internal `minio:9000` host (not
  // browser-reachable); the BFF follows that redirect server-side and buffers
  // the bytes so the public /v1/media/:id route can serve them same-origin.
  fetchAsset(assetId: string): Promise<MediaAsset>;
  // Server-side upload: sign → PUT to MinIO → complete, all from the BFF.
  // The presigned PUT URL targets the internal `minio:9000` host, so the
  // browser can't PUT to it directly; the BFF proxies the bytes (same reason
  // as fetchAsset). Returns the new asset id.
  uploadAsset(ownerId: string, mimeType: string, body: Buffer): Promise<{ asset_id: string }>;
}

declare module "fastify" {
  interface FastifyInstance {
    mediaSvc: MediaSvc;
  }
}

function mediaSvcPlugin(fastify: FastifyInstance, _opts: object, done: () => void): void {
  const { MEDIA_SVC_URL, MEDIA_SVC_INTERNAL_TOKEN } = loadConfig();

  const mediaSvc: MediaSvc = {
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

    async fetchAsset(assetId: string): Promise<MediaAsset> {
      // fetch follows media-svc's 302 → MinIO presigned GET automatically.
      const res = await fetch(`${MEDIA_SVC_URL}/v1/assets/${assetId}`);
      if (!res.ok) {
        return { ok: false, status: res.status, contentType: null, body: null };
      }
      return {
        ok: true,
        status: res.status,
        contentType: res.headers.get("content-type"),
        body: await res.arrayBuffer(),
      };
    },

    async uploadAsset(
      ownerId: string,
      mimeType: string,
      body: Buffer,
    ): Promise<{ asset_id: string }> {
      const { put_url, asset_id } = await mediaSvc.signUpload(ownerId, mimeType, body.byteLength);
      // The presigned PUT is content-type-bound; the header MUST match the
      // mime media-svc signed with, or MinIO rejects the signature.
      const put = await fetch(put_url, {
        method: "PUT",
        headers: { "content-type": mimeType },
        body,
      });
      if (!put.ok) {
        throw new Error(`minio PUT responded ${put.status}`);
      }
      await mediaSvc.completeUpload(asset_id);
      return { asset_id };
    },
  };
  fastify.decorate("mediaSvc", mediaSvc);
  done();
}

export default fp(mediaSvcPlugin, { name: "bff-media-svc" });
