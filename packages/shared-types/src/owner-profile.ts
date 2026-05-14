import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, PhoneSchema, EmailSchema } from "./common.js";
import { I18nTextSchema } from "./i18n.js";

export const OwnerProfileSchema = z
  .object({
    owner_id: UuidSchema,
    bio: I18nTextSchema.optional(),
    photo: z.string().uuid().optional(),
    phone: PhoneSchema.optional(),
    call_enabled: z.boolean().default(false),
    dm_channels: z.object({
      in_app: z.boolean(),
      telegram: z.boolean(),
      whatsapp_link: z.boolean(),
      whatsapp_cloud: z.boolean(),
    }),
    email: EmailSchema.optional(),
    updated_at: IsoDateTimeSchema,
  })
  .strict();
export type OwnerProfile = z.infer<typeof OwnerProfileSchema>;
