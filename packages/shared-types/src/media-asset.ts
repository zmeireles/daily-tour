import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { MediaKindSchema, OwnerScopeSchema } from "./enums.js";

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
    variants: z
      .record(
        z.object({
          key: z.string(),
          width: z.number().int(),
          height: z.number().int(),
          mime: z.string(),
        }),
      )
      .default({}),
    created_at: IsoDateTimeSchema,
  })
  .strict();
export type MediaAsset = z.infer<typeof MediaAssetSchema>;
