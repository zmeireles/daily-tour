import { z } from "zod";

export const UuidSchema = z.string().uuid();

export const IsoDateTimeSchema = z.string().datetime({ offset: true });

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const GeomSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const UrlSchema = z.string().url();

export const EmailSchema = z.string().email().toLowerCase();

export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/);

export const SlugSchema = z.string().regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);

export const VERSION = "0.1.0" as const;
