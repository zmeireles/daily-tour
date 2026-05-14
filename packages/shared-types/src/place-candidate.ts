import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema } from "./common.js";
import { PlaceSchema } from "./place.js";

export const PlaceCandidateSchema = z
  .object({
    id: UuidSchema,
    source: z.enum(["google_places", "osm", "crawl", "manual"]),
    source_ref: z.string(),
    raw: z.record(z.unknown()),
    dedupe_hash: z.string(),
    status: z.enum(["new", "reviewed", "approved", "rejected"]),
    proposed_place: PlaceSchema.partial().optional(),
    created_at: IsoDateTimeSchema,
  })
  .strict();
export type PlaceCandidate = z.infer<typeof PlaceCandidateSchema>;
