import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const ChatThreadSchema = z
  .object({
    id: UuidSchema,
    reservation_id: UuidSchema,
    owner_id: UuidSchema,
    created_at: IsoDateTimeSchema,
    last_message_at: IsoDateTimeSchema.optional(),
  })
  .strict();
export type ChatThread = z.infer<typeof ChatThreadSchema>;
