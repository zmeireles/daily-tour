import { z } from "zod";

// The locales the app can actually serve — the same four imported into the
// PWA's i18n `resources`. Narrowed from six in #383: accepting 'pt-BR' or 'de'
// here let a reservation be created for a guest whose UI would then be entirely
// English, silently, because it read as a language preference rather than a
// failure.
//
// This list exists in three places — here, the drizzle schema, and the database
// CHECK — and all three must move together. Widening one alone is how they
// drifted apart in the first place.
export const LocaleSchema = z.enum(["en", "pt-PT", "es", "fr"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const ChannelSchema = z.enum(["in_app", "telegram", "whatsapp_link", "whatsapp_cloud"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const MessageDirectionSchema = z.enum(["inbound", "outbound"]);
export type MessageDirection = z.infer<typeof MessageDirectionSchema>;

export const DeliveryStateSchema = z.enum(["sent", "delivered", "read", "failed"]);
export type DeliveryState = z.infer<typeof DeliveryStateSchema>;

export const PlaceStatusSchema = z.enum(["draft", "owner_approved", "published", "archived"]);
export type PlaceStatus = z.infer<typeof PlaceStatusSchema>;

export const GuesthouseStatusSchema = z.enum(["active", "archived"]);
export type GuesthouseStatus = z.infer<typeof GuesthouseStatusSchema>;

export const ReservationStatusSchema = z.enum([
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
]);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const TourPlanStatusSchema = z.enum([
  "pending",
  "retrieving",
  "planning",
  "validating",
  "completed",
  "failed",
]);
export type TourPlanStatus = z.infer<typeof TourPlanStatusSchema>;

export const TourSlotSchema = z.enum([
  "breakfast",
  "morning",
  "lunch",
  "afternoon",
  "dinner",
  "evening",
]);
export type TourSlot = z.infer<typeof TourSlotSchema>;

export const OwnerScopeSchema = z.enum(["guesthouse", "owner", "guest", "system"]);
export type OwnerScope = z.infer<typeof OwnerScopeSchema>;

export const MediaKindSchema = z.enum(["image", "video"]);
export type MediaKind = z.infer<typeof MediaKindSchema>;
