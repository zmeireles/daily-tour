import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { MessageDirectionSchema, ChannelSchema, DeliveryStateSchema } from "./enums.js";

export const MessageSchema = z
  .object({
    id: UuidSchema,
    thread_id: UuidSchema,
    direction: MessageDirectionSchema,
    channel: ChannelSchema,
    ext_ref: z.string().optional(),
    body: z.string(),
    attachments: z.array(z.string().uuid()).default([]),
    delivery_state: DeliveryStateSchema,
    ts: IsoDateTimeSchema,
  })
  .strict();
export type Message = z.infer<typeof MessageSchema>;
