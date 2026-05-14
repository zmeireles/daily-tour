# @daily-tour/shared-types

Canonical Zod schemas and inferred TypeScript types for every domain entity in the Daily Tour platform. All Node services (BFF, catalog-svc, chat-hub, reservation-token-svc, media-svc, notif-svc) import from this package. Python services (search-svc, planner-svc, ingest-svc) hand-mirror these schemas into Pydantic v2 — the Python mirror lives in T-0.2.2 and **must use the exact field names defined here**.

## Usage

**BFF route (server-side parse):**

```ts
import { ReservationSchema, type Reservation } from "@daily-tour/shared-types";

const reservation: Reservation = ReservationSchema.parse(rawBody);
```

**PWA client form (react-hook-form + zodResolver mental model):**

```ts
import { TourPlanSchema } from "@daily-tour/shared-types";
// Pass TourPlanSchema to zodResolver — no React import needed in shared-types itself
const schema = TourPlanSchema.pick({ params: true });
```

## Exported namespaces

- **Enums**: `LocaleSchema`, `ChannelSchema`, `MessageDirectionSchema`, `DeliveryStateSchema`, `PlaceStatusSchema`, `ReservationStatusSchema`, `TourPlanStatusSchema`, `TourSlotSchema`, `OwnerScopeSchema`, `MediaKindSchema` — each paired with an inferred TS type.
- **Primitives**: `UuidSchema`, `IsoDateTimeSchema`, `IsoDateSchema`, `GeomSchema`, `UrlSchema`, `EmailSchema`, `PhoneSchema`, `SlugSchema`.
- **i18n**: `I18nTextSchema`, `type I18nText`, `pickLocale(text, preferred, fallback?)`.
- **Entity schemas**: `ReservationSchema`, `GuestSchema`, `GuesthouseSchema`, `OwnerProfileSchema`, `ActionSchema`, `WishSchema`, `PlaceSchema`, `PlaceCandidateSchema`, `MediaAssetSchema`, `ChatThreadSchema`, `MessageSchema`, `ChannelBindingSchema`, `TourStepSchema`, `TourPlanSchema`, `TokenGrantSchema`.
- **VERSION constant**: `"0.1.0"` — bump this when any breaking schema change lands (new required field, renamed field, stricter validation). Python mirror maintainers watch this value.

## Versioning rule

`VERSION` lives in `src/common.ts`. Bump on any breaking schema change. Additive optional fields are non-breaking; skip the bump.

## Python mirror

The Python Pydantic v2 mirror for these schemas is maintained in T-0.2.2. Field names must match exactly. If you rename a field here, update the Python mirror in the same PR.
