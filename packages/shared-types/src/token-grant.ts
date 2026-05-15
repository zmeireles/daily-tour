import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const TokenGrantSchema = z
  .object({
    jti: z.string(),
    reservation_id: UuidSchema,
    issued_at: IsoDateTimeSchema,
    expires_at: IsoDateTimeSchema,
    revoked_at: IsoDateTimeSchema.optional(),
  })
  .strict();
export type TokenGrant = z.infer<typeof TokenGrantSchema>;
