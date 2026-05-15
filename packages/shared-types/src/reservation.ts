import { z } from "zod";
import { LocaleSchema, ReservationStatusSchema } from "./enums.js";
import { UuidSchema, IsoDateTimeSchema, IsoDateSchema } from "./common.js";

export const ReservationSchema = z
  .object({
    id: UuidSchema,
    guesthouse_id: UuidSchema,
    guest_id: UuidSchema,
    checkin: IsoDateSchema,
    checkout: IsoDateSchema,
    party_size: z.number().int().positive(),
    locale: LocaleSchema,
    status: ReservationStatusSchema,
    created_at: IsoDateTimeSchema,
    updated_at: IsoDateTimeSchema,
  })
  .strict();
export type Reservation = z.infer<typeof ReservationSchema>;
