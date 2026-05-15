import { z } from "zod";
import {
  UuidSchema,
  IsoDateTimeSchema,
  GeomSchema,
  PhoneSchema,
  EmailSchema,
  UrlSchema,
} from "./common.js";
import { PlaceStatusSchema } from "./enums.js";
import { I18nTextSchema } from "./i18n.js";

export const PlaceSchema = z
  .object({
    id: UuidSchema,
    guesthouse_scope: z.union([z.literal("all"), z.array(z.string().uuid())]),
    name: I18nTextSchema,
    description: I18nTextSchema,
    geom: GeomSchema,
    address: z.string(),
    contacts: z.object({
      phone: PhoneSchema.optional(),
      email: EmailSchema.optional(),
      website: UrlSchema.optional(),
      social: z
        .array(
          z.object({
            kind: z.enum(["instagram", "facebook", "tiktok", "whatsapp", "telegram", "other"]),
            handle: z.string(),
          }),
        )
        .default([]),
    }),
    hours: z
      .array(
        z.object({
          dow: z.number().int().min(0).max(6),
          open: z.string().regex(/^\d{2}:\d{2}$/),
          close: z.string().regex(/^\d{2}:\d{2}$/),
        }),
      )
      .default([]),
    actions: z.array(z.string().uuid()).min(1),
    wishes: z.array(z.string().uuid()).default([]),
    media: z.array(z.string().uuid()),
    status: PlaceStatusSchema,
    is_hosts_pick: z.boolean().default(false),
    source: z.object({
      kind: z.enum(["manual", "google_places", "osm", "crawl"]),
      ref: z.string().optional(),
      retrieved_at: IsoDateTimeSchema.optional(),
    }),
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
  })
  .strict();
export type Place = z.infer<typeof PlaceSchema>;
