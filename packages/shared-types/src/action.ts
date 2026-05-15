import { z } from "zod";
import { UuidSchema, SlugSchema } from "./common.js";
import { I18nTextSchema } from "./i18n.js";

export const ActionSchema = z
  .object({
    id: UuidSchema,
    slug: SlugSchema,
    i18n: I18nTextSchema,
    sort_order: z.number().int().nonnegative(),
    icon: z.string(),
  })
  .strict();
export type Action = z.infer<typeof ActionSchema>;
