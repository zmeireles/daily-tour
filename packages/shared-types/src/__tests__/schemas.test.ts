import { describe, it, expect } from "vitest";
import {
  ReservationSchema,
  GuestSchema,
  GuesthouseSchema,
  OwnerProfileSchema,
  ActionSchema,
  WishSchema,
  PlaceSchema,
  PlaceCandidateSchema,
  MediaAssetSchema,
  ChatThreadSchema,
  MessageSchema,
  ChannelBindingSchema,
  TourStepSchema,
  TourPlanSchema,
  TokenGrantSchema,
  I18nTextSchema,
  pickLocale,
  VERSION,
} from "../index.js";
import {
  validReservation,
  validGuest,
  validGuesthouse,
  validOwnerProfile,
  validAction,
  validWish,
  validPlace,
  validPlaceCandidate,
  validMediaAsset,
  validChatThread,
  validMessage,
  validChannelBinding,
  validTourStep,
  validTourPlan,
  validTokenGrant,
} from "./fixtures.js";

describe("VERSION", () => {
  it("is exported as a string constant", () => {
    expect(VERSION).toBe("0.1.0");
  });
});

describe("ReservationSchema", () => {
  it("parses a valid reservation", () => {
    expect(ReservationSchema.parse(validReservation)).toEqual(validReservation);
  });

  it("rejects negative party_size", () => {
    const result = ReservationSchema.safeParse({
      ...validReservation,
      party_size: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const path = result.error.issues[0]?.path;
      expect(path).toContain("party_size");
    }
  });

  it("rejects invalid status", () => {
    const result = ReservationSchema.safeParse({
      ...validReservation,
      status: "unknown_status",
    });
    expect(result.success).toBe(false);
  });
});

describe("GuestSchema", () => {
  it("parses a valid guest", () => {
    expect(GuestSchema.parse(validGuest)).toEqual(validGuest);
  });

  it("rejects empty display_name", () => {
    const result = GuestSchema.safeParse({ ...validGuest, display_name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("display_name");
    }
  });

  it("rejects invalid locale", () => {
    const result = GuestSchema.safeParse({ ...validGuest, locale: "zz" });
    expect(result.success).toBe(false);
  });
});

describe("GuesthouseSchema", () => {
  it("parses a valid guesthouse", () => {
    expect(GuesthouseSchema.parse(validGuesthouse)).toEqual(validGuesthouse);
  });

  it("rejects out-of-range lat", () => {
    const result = GuesthouseSchema.safeParse({
      ...validGuesthouse,
      geom: { lat: 100, lng: -25.311 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths.some((p) => p.includes("lat"))).toBe(true);
    }
  });
});

describe("OwnerProfileSchema", () => {
  it("parses a valid owner profile", () => {
    expect(OwnerProfileSchema.parse(validOwnerProfile)).toMatchObject(validOwnerProfile);
  });

  it("rejects invalid phone format", () => {
    const result = OwnerProfileSchema.safeParse({
      ...validOwnerProfile,
      phone: "not-a-phone",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("phone");
    }
  });
});

describe("ActionSchema", () => {
  it("parses a valid action", () => {
    expect(ActionSchema.parse(validAction)).toEqual(validAction);
  });

  it("rejects invalid slug (uppercase)", () => {
    const result = ActionSchema.safeParse({ ...validAction, slug: "Eat" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("slug");
    }
  });
});

describe("WishSchema", () => {
  it("parses a valid wish", () => {
    expect(WishSchema.parse(validWish)).toEqual(validWish);
  });

  it("rejects negative sort_order", () => {
    const result = WishSchema.safeParse({ ...validWish, sort_order: -1 });
    expect(result.success).toBe(false);
  });
});

describe("PlaceSchema", () => {
  it("parses a valid place with guesthouse_scope=all", () => {
    expect(PlaceSchema.parse(validPlace)).toMatchObject(validPlace);
  });

  it("parses a valid place with guesthouse_scope as uuid array", () => {
    const place = {
      ...validPlace,
      guesthouse_scope: ["00000000-0000-0000-0000-000000000002"],
    };
    expect(PlaceSchema.parse(place)).toMatchObject({
      guesthouse_scope: ["00000000-0000-0000-0000-000000000002"],
    });
  });

  it("rejects empty actions array", () => {
    const result = PlaceSchema.safeParse({ ...validPlace, actions: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("actions");
    }
  });

  it("rejects unknown status", () => {
    const result = PlaceSchema.safeParse({
      ...validPlace,
      status: "invisible",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a seasonal place (summer/winter) and treats absent season as year-round", () => {
    expect(PlaceSchema.parse({ ...validPlace, season: "summer" }).season).toBe("summer");
    expect(PlaceSchema.parse({ ...validPlace, season: "winter" }).season).toBe("winter");
    expect(PlaceSchema.parse({ ...validPlace, season: null }).season).toBeNull();
    // Absent season parses (year-round) — validPlace omits the key.
    expect(PlaceSchema.parse(validPlace).season).toBeUndefined();
  });

  it("rejects an unknown season value", () => {
    const result = PlaceSchema.safeParse({ ...validPlace, season: "autumn" });
    expect(result.success).toBe(false);
  });
});

describe("PlaceCandidateSchema", () => {
  it("parses a valid place candidate", () => {
    expect(PlaceCandidateSchema.parse(validPlaceCandidate)).toMatchObject(validPlaceCandidate);
  });

  it("rejects invalid source", () => {
    const result = PlaceCandidateSchema.safeParse({
      ...validPlaceCandidate,
      source: "twitter",
    });
    expect(result.success).toBe(false);
  });
});

describe("MediaAssetSchema", () => {
  it("parses a valid media asset", () => {
    expect(MediaAssetSchema.parse(validMediaAsset)).toMatchObject(validMediaAsset);
  });

  it("rejects non-positive bytes", () => {
    const result = MediaAssetSchema.safeParse({
      ...validMediaAsset,
      bytes: 0,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("bytes");
    }
  });
});

describe("ChatThreadSchema", () => {
  it("parses a valid chat thread", () => {
    expect(ChatThreadSchema.parse(validChatThread)).toEqual(validChatThread);
  });

  it("rejects invalid uuid for reservation_id", () => {
    const result = ChatThreadSchema.safeParse({
      ...validChatThread,
      reservation_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

describe("MessageSchema", () => {
  it("parses a valid message", () => {
    expect(MessageSchema.parse(validMessage)).toMatchObject(validMessage);
  });

  it("rejects invalid direction", () => {
    const result = MessageSchema.safeParse({
      ...validMessage,
      direction: "sideways",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid delivery_state", () => {
    const result = MessageSchema.safeParse({
      ...validMessage,
      delivery_state: "bounced",
    });
    expect(result.success).toBe(false);
  });
});

describe("ChannelBindingSchema", () => {
  it("parses a valid channel binding", () => {
    expect(ChannelBindingSchema.parse(validChannelBinding)).toMatchObject(validChannelBinding);
  });

  it("rejects invalid channel", () => {
    const result = ChannelBindingSchema.safeParse({
      ...validChannelBinding,
      channel: "fax",
    });
    expect(result.success).toBe(false);
  });
});

describe("TourStepSchema", () => {
  it("parses a valid tour step", () => {
    expect(TourStepSchema.parse(validTourStep)).toMatchObject(validTourStep);
  });

  it("rejects invalid slot", () => {
    const result = TourStepSchema.safeParse({
      ...validTourStep,
      slot: "midnight",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative travel_to_minutes", () => {
    const result = TourStepSchema.safeParse({
      ...validTourStep,
      travel_to_minutes: -5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("travel_to_minutes");
    }
  });
});

describe("TourPlanSchema", () => {
  it("parses a valid tour plan", () => {
    expect(TourPlanSchema.parse(validTourPlan)).toMatchObject(validTourPlan);
  });

  it("rejects invalid vehicle", () => {
    const result = TourPlanSchema.safeParse({
      ...validTourPlan,
      params: { ...validTourPlan.params, vehicle: "bicycle" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative llm_cost_usd", () => {
    const result = TourPlanSchema.safeParse({
      ...validTourPlan,
      llm_cost_usd: -0.01,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("llm_cost_usd");
    }
  });
});

describe("TokenGrantSchema", () => {
  it("parses a valid token grant", () => {
    expect(TokenGrantSchema.parse(validTokenGrant)).toEqual(validTokenGrant);
  });

  it("rejects non-uuid reservation_id", () => {
    const result = TokenGrantSchema.safeParse({
      ...validTokenGrant,
      reservation_id: "bad",
    });
    expect(result.success).toBe(false);
  });
});

describe("I18nTextSchema", () => {
  it("parses a valid i18n text map", () => {
    expect(I18nTextSchema.parse({ en: "Hello" })).toEqual({ en: "Hello" });
  });

  it("rejects an empty record", () => {
    const result = I18nTextSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid locale key", () => {
    const result = I18nTextSchema.safeParse({ zz: "Hello" });
    expect(result.success).toBe(false);
  });
});

describe("pickLocale", () => {
  it("returns preferred locale when present", () => {
    expect(pickLocale({ en: "Hello", "pt-PT": "Olá" }, "pt-PT")).toBe("Olá");
  });

  it("falls back to 'en' when preferred is missing", () => {
    expect(pickLocale({ en: "Hello" }, "de")).toBe("Hello");
  });

  it("falls back to explicit fallback locale", () => {
    expect(pickLocale({ "pt-PT": "Olá" }, "de", "pt-PT")).toBe("Olá");
  });

  // The defect the four-helper unification exposed (#392). Every previous
  // helper resolved the base language as `text[base]` — a lookup for a key
  // called `pt` — while the maps are keyed `pt-PT`. So a Brazilian or
  // region-less Portuguese speaker fell straight past perfectly good
  // Portuguese content to the English baseline. Same shape as the bug #403
  // fixed in the language detector.
  it("resolves a regional tag to same-base content, not to the fallback", () => {
    const name = { en: "Miguel's House", "pt-PT": "Casa do Miguel" };
    expect(pickLocale(name, "pt-BR")).toBe("Casa do Miguel");
    expect(pickLocale(name, "pt")).toBe("Casa do Miguel");
    expect(pickLocale(name, "PT-br")).toBe("Casa do Miguel");
  });

  it("prefers an exact key over a same-base one", () => {
    expect(pickLocale({ "pt-PT": "Europeu", en: "English" }, "pt-PT")).toBe("Europeu");
  });

  it("takes each fallback in turn", () => {
    // The owner console's Today screen passes ["pt-PT", "en"]; every other
    // surface passes the default "en". Making the chain explicit is what let
    // four helpers become one without silently changing either.
    expect(pickLocale({ en: "EN", "pt-PT": "PT" }, "fr", ["pt-PT", "en"])).toBe("PT");
    expect(pickLocale({ en: "EN", "pt-PT": "PT" }, "fr")).toBe("EN");

    // ⚠️ The second entry has to be reachable independently of the
    // any-value fallback, or the case proves nothing: with `{ en }` alone,
    // "take en" and "give up and take the first value" both answer "EN".
    // `de` sorts first here, so only a real second hop returns "EN".
    expect(pickLocale({ de: "DE", en: "EN" }, "fr", ["pt-PT", "en"])).toBe("EN");
  });

  it("ignores an empty string as if the key were absent", () => {
    expect(pickLocale({ "pt-PT": "", en: "English" }, "pt-PT")).toBe("English");
  });

  it("returns any value when preferred and fallback are missing", () => {
    const result = pickLocale({ fr: "Bonjour" }, "de", "en");
    expect(result).toBe("Bonjour");
  });

  it("returns empty string for empty object", () => {
    // I18nText enforces at least one key via schema, but pickLocale is a runtime helper
    // that accepts the type — test with a cast to exercise the branch
    const result = pickLocale({}, "en");
    expect(result).toBe("");
  });
});
