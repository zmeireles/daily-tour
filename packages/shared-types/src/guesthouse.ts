import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, GeomSchema, SlugSchema } from "./common.js";
import { I18nTextSchema } from "./i18n.js";

export const GuesthouseSchema = z
  .object({
    id: UuidSchema,
    owner_id: UuidSchema,
    name: I18nTextSchema,
    slug: SlugSchema,
    address: z.string(),
    geom: GeomSchema,
    media: z.array(z.string().uuid()),
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
  })
  .strict();
export type Guesthouse = z.infer<typeof GuesthouseSchema>;
