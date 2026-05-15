import { describe, it, expectTypeOf } from "vitest";
import { z } from "zod";
import {
  PlaceSchema,
  type Place,
  ReservationSchema,
  type Reservation,
  GuestSchema,
  type Guest,
  TourPlanSchema,
  type TourPlan,
} from "../index.js";

describe("type-level assertions", () => {
  it("z.infer<typeof PlaceSchema> is assignable to Place", () => {
    type Inferred = z.infer<typeof PlaceSchema>;
    expectTypeOf<Inferred>().toMatchTypeOf<Place>();
  });

  it("z.infer<typeof ReservationSchema> is assignable to Reservation", () => {
    type Inferred = z.infer<typeof ReservationSchema>;
    expectTypeOf<Inferred>().toMatchTypeOf<Reservation>();
  });

  it("z.infer<typeof GuestSchema> is assignable to Guest", () => {
    type Inferred = z.infer<typeof GuestSchema>;
    expectTypeOf<Inferred>().toMatchTypeOf<Guest>();
  });

  it("z.infer<typeof TourPlanSchema> is assignable to TourPlan", () => {
    type Inferred = z.infer<typeof TourPlanSchema>;
    expectTypeOf<Inferred>().toMatchTypeOf<TourPlan>();
  });
});
