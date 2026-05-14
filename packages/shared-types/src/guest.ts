import { z } from "zod";
import { LocaleSchema } from "./enums.js";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";

export const GuestSchema = z
  .object({
    id: UuidSchema,
    display_name: z.string().min(1).max(200),
    locale: LocaleSchema,
    opt_in_flags: z.object({
      marketing: z.boolean().default(false),
      analytics: z.boolean().default(false),
    }),
    created_at: IsoDateTimeSchema,
  })
  .strict();
export type Guest = z.infer<typeof GuestSchema>;
