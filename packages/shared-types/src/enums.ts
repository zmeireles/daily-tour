import { z } from "zod";

export const LocaleSchema = z.enum(["en", "pt-PT", "pt-BR", "de", "es", "fr"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const ChannelSchema = z.enum(["in_app", "telegram", "whatsapp_link", "whatsapp_cloud"]);
export type Channel = z.infer<typeof ChannelSchema>;

export const MessageDirectionSchema = z.enum(["inbound", "outbound"]);
export type MessageDirection = z.infer<typeof MessageDirectionSchema>;

export const DeliveryStateSchema = z.enum(["sent", "delivered", "read", "failed"]);
export type DeliveryState = z.infer<typeof DeliveryStateSchema>;

export const PlaceStatusSchema = z.enum(["draft", "owner_approved", "published", "archived"]);
export type PlaceStatus = z.infer<typeof PlaceStatusSchema>;

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
