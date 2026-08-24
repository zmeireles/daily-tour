import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { MediaKindSchema, OwnerScopeSchema } from "./enums.js";

/**
 * Variant map key: `<width>w_<format>`, e.g. `600w_avif`. Validated rather than
 * left as a free string so a worker that changes its naming breaks loudly here
 * instead of silently producing variants no consumer can address.
 */
export const VariantKeySchema = z.string().regex(/^\d+w_(avif|webp)$/);

export const MediaAssetSchema = z
  .object({
    id: UuidSchema,
    bucket_key: z.string(),
    mime: z.string(),
    kind: MediaKindSchema,
    dims: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .optional(),
    bytes: z.number().int().positive(),
    owner_scope: OwnerScopeSchema,
    owner_id: z.string().uuid(),
    // dt-tests #37 — the declared shape was `{key,width,height,mime}` objects
    // while the transcode worker has always written plain bucket-key STRINGS
    // (workers/transcode.ts: `variants[`${size}w_${fmt}`] = key`). The stored
    // qual data is strings. Nothing ever threw, because this schema was never
    // wired to a boundary — a shape mismatch that cannot fire is itself
    // evidence that nothing consumed the output.
    //
    // The contract now matches reality rather than the reverse: the key name
    // already carries both facts a consumer needs (width and format), so the
    // richer object bought nothing and would have cost a data migration.
    variants: z.record(VariantKeySchema, z.string()).default({}),
    created_at: IsoDateTimeSchema,
  })
  .strict();
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
