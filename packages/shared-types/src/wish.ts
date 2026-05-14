import { z } from "zod";
import { UuidSchema, SlugSchema } from "./common.js";
import { I18nTextSchema } from "./i18n.js";

export const WishSchema = z
  .object({
    id: UuidSchema,
    action_id: UuidSchema,
    slug: SlugSchema,
    i18n: I18nTextSchema,
    sort_order: z.number().int().nonnegative(),
  })
  .strict();
export type Wish = z.infer<typeof WishSchema>;
