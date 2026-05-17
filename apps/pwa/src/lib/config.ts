// Placeholder email — replace with the owner's actual address before go-live.
export const CHECK_AVAILABILITY_MAILTO = "info@dailytour.example";

// Placeholder phone — real per-place phones land in T-1.4.x owner CRUD.
export const GUESTHOUSE_CONTACT_PHONE = "+351912345678";

// Placeholder guesthouse coords keyed by guesthouseId from the JWT `gh` claim.
// T-1.4.x owner CRUD will replace this with a real BFF lookup at /v1/guesthouses/:id.
export const GUESTHOUSE_LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  "gh-1": { lat: 37.7412, lng: -25.6756, name: "Casa de São Miguel" },
};
