import type {
  Reservation,
  Guest,
  Guesthouse,
  OwnerProfile,
  Action,
  Wish,
  Place,
  PlaceCandidate,
  MediaAsset,
  ChatThread,
  Message,
  ChannelBinding,
  TourStep,
  TourPlan,
  TokenGrant,
} from "../index.js";

const NOW = "2026-05-14T10:00:00Z";
const DATE = "2026-05-14";
const UUID_A = "00000000-0000-0000-0000-000000000001";
const UUID_B = "00000000-0000-0000-0000-000000000002";
const UUID_C = "00000000-0000-0000-0000-000000000003";

export const validReservation: Reservation = {
  id: UUID_A,
  guesthouse_id: UUID_B,
  guest_id: UUID_C,
  checkin: DATE,
  checkout: "2026-05-18",
  party_size: 2,
  locale: "en",
  status: "confirmed",
  created_at: NOW,
  updated_at: NOW,
};

export const validGuest: Guest = {
  id: UUID_A,
  display_name: "Marta Silva",
  locale: "pt-PT",
  opt_in_flags: { marketing: false, analytics: false },
  created_at: NOW,
};

export const validGuesthouse: Guesthouse = {
  id: UUID_A,
  owner_id: UUID_B,
  name: { en: "Casa do Sol", "pt-PT": "Casa do Sol" },
  slug: "casa-do-sol",
  address: "Rua das Furnas 12, Furnas, São Miguel",
  geom: { lat: 37.775, lng: -25.311 },
  media: [UUID_C],
  status: "active",
  rooms: 4,
  hidden_place_ids: [],
  created_at: NOW,
  updated_at: NOW,
};

export const validOwnerProfile: OwnerProfile = {
  owner_id: UUID_A,
  call_enabled: true,
  dm_channels: {
    in_app: true,
    telegram: true,
    whatsapp_link: true,
    whatsapp_cloud: false,
  },
  updated_at: NOW,
};

export const validAction: Action = {
  id: UUID_A,
  slug: "eat",
  i18n: { en: "Eat", "pt-PT": "Comer" },
  sort_order: 0,
  icon: "utensils",
};

export const validWish: Wish = {
  id: UUID_A,
  action_id: UUID_B,
  slug: "near-the-sea",
  i18n: { en: "Near the sea", "pt-PT": "Perto do mar" },
  sort_order: 0,
};

export const validPlace: Place = {
  id: UUID_A,
  guesthouse_scope: "all",
  name: { en: "Furnas Lake" },
  description: { en: "A volcanic crater lake with unique flora." },
  geom: { lat: 37.775, lng: -25.311 },
  address: "Furnas, São Miguel, Azores",
  contacts: {
    social: [],
  },
  hours: [],
  actions: [UUID_B],
  wishes: [],
  media: [UUID_C],
  status: "published",
  is_hosts_pick: false,
  source: { kind: "manual" },
  created_at: NOW,
  updated_at: NOW,
};

export const validPlaceCandidate: PlaceCandidate = {
  id: UUID_A,
  source: "google_places",
  source_ref: "ChIJ_xyz123",
  raw: { name: "Furnas Lake", place_id: "ChIJ_xyz123" },
  dedupe_hash: "abc123deadbeef",
  status: "new",
  created_at: NOW,
};

export const validMediaAsset: MediaAsset = {
  id: UUID_A,
  bucket_key: "media/abc123.jpg",
  mime: "image/jpeg",
  kind: "image",
  bytes: 204800,
  owner_scope: "guesthouse",
  owner_id: UUID_B,
  variants: {},
  created_at: NOW,
};

export const validChatThread: ChatThread = {
  id: UUID_A,
  reservation_id: UUID_B,
  owner_id: UUID_C,
  created_at: NOW,
};

export const validMessage: Message = {
  id: UUID_A,
  thread_id: UUID_B,
  direction: "inbound",
  channel: "in_app",
  body: "Hello, what time is breakfast?",
  attachments: [],
  delivery_state: "sent",
  ts: NOW,
};

export const validChannelBinding: ChannelBinding = {
  id: UUID_A,
  thread_id: UUID_B,
  channel: "telegram",
  ext_chat_id: "123456789",
};

export const validTourStep: TourStep = {
  slot: "lunch",
  place_id: UUID_A,
  start: "2026-05-15T12:30:00Z",
  end: "2026-05-15T14:30:00Z",
  rationale: "Local cozido restaurant with sea view.",
  locked: false,
};

export const validTourPlan: TourPlan = {
  id: UUID_A,
  reservation_id: UUID_B,
  params: {
    date: "2026-05-15",
    start_time: "09:30",
    end_time: "18:30",
    party_size: 2,
    vehicle: "car",
  },
  status: "completed",
  steps: [validTourStep],
  weather_aware: false,
  created_at: NOW,
};

export const validTokenGrant: TokenGrant = {
  jti: "tok_opaque_abc123",
  reservation_id: UUID_A,
  issued_at: NOW,
  expires_at: "2026-05-19T10:00:00Z",
};
