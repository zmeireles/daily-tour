import { z } from "zod";
import { UuidSchema, IsoDateTimeSchema, IsoDateSchema } from "./common.js";
import { TourSlotSchema, TourPlanStatusSchema } from "./enums.js";

export const TourStepSchema = z
  .object({
    slot: TourSlotSchema,
    place_id: UuidSchema,
    start: IsoDateTimeSchema,
    end: IsoDateTimeSchema,
    rationale: z.string(),
    travel_to_minutes: z.number().int().nonnegative().optional(),
    locked: z.boolean().default(false),
  })
  .strict();
export type TourStep = z.infer<typeof TourStepSchema>;

export const TourPlanSchema = z
  .object({
    id: UuidSchema,
    reservation_id: UuidSchema,
    params: z.object({
      date: IsoDateSchema,
      start_time: z.string().regex(/^\d{2}:\d{2}$/),
      end_time: z.string().regex(/^\d{2}:\d{2}$/),
      party_size: z.number().int().positive(),
      vehicle: z.enum(["car", "none"]),
      notes: z.string().optional(),
    }),
    status: TourPlanStatusSchema,
    steps: z.array(TourStepSchema),
    weather_aware: z.boolean().default(false),
    llm_cost_usd: z.number().nonnegative().optional(),
    created_at: IsoDateTimeSchema,
    completed_at: IsoDateTimeSchema.optional(),
  })
  .strict();
export type TourPlan = z.infer<typeof TourPlanSchema>;
