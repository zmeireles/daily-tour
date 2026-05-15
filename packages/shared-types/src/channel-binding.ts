import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { ChannelSchema } from "./enums.js";

export const ChannelBindingSchema = z
  .object({
    id: UuidSchema,
    thread_id: UuidSchema,
    channel: ChannelSchema,
    ext_chat_id: z.string(),
    verified_at: IsoDateTimeSchema.optional(),
  })
  .strict();
export type ChannelBinding = z.infer<typeof ChannelBindingSchema>;
