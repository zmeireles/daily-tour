import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlaceForm } from "@/features/backoffice/places/place-form";
import type { PlaceRow } from "@/features/backoffice/places/use-places";

// Navigation: mock useNavigate so the form needs no Router provider, and stub
// useBlocker (the dirty-guard) since there's no data router in these tests.
const mockNavigate = vi.fn();
vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useBlocker: () => ({ state: "unblocked", proceed: undefined, reset: undefined }),
  };
});

// MediaUploader: stub it so these tests don't depend on useOwnerJwt or the
// upload signing chain. The stub re-exposes the initialAssets the form threads
// in via a data attribute, which is the load-bearing assertion for the #151
// data-loss regression.
vi.mock("@/features/backoffice/places/media-uploader", () => ({
  MediaUploader: (props: { initialAssets?: Array<{ assetId: string }> }) => (
    <div
      data-testid="media-uploader-stub"
      data-initial-asset-ids={JSON.stringify((props.initialAssets ?? []).map((a) => a.assetId))}
    />
  ),
}));

// Field-translation hook: the real one calls useMutation (needs a QueryClient)
// and hits /v1/admin/translate. Inject an inert controller so the form's
// TranslatableFields render offline. LOCALE_SUFFIX stays real (TranslatableField
// derives field names from it).
vi.mock("@/lib/i18n/use-field-translation", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/i18n/use-field-translation")>();
  return {
    ...actual,
    useFieldTranslation: () => ({
      translateField: vi.fn().mockResolvedValue(true),
      translateAll: vi.fn().mockResolvedValue(undefined),
      status: () => ({ translating: false, autoTranslated: false, outOfSync: false }),
      _notifyEdit: vi.fn(),
    }),
  };
});

// Mutation hooks: controlled mutateAsync mocks so we can assert the submit body
// and inject errors without touching fetch.
vi.mock("@/features/backoffice/places/use-places", () => ({
  useCreatePlace: vi.fn(),
  useUpdatePlace: vi.fn(),
  useActionTaxonomy: vi.fn(),
}));

const { useCreatePlace, useUpdatePlace, useActionTaxonomy } =
  await import("@/features/backoffice/places/use-places");

// The action picker's taxonomy. Two actions with one wish each is enough to drive
// select/deselect and the "action without a wish" invalid state.
const TAXONOMY = [
  {
    slug: "eat",
    icon: "utensils",
    label_i18n: { en: "Eat", "pt-PT": "Comer" },
    wishes: [{ slug: "sea-view", label_i18n: { en: "Sea view", "pt-PT": "Vista para o mar" } }],
  },
  {
    slug: "drink",
    icon: "wine",
    label_i18n: { en: "Drink", "pt-PT": "Beber" },
    wishes: [{ slug: "cafe", label_i18n: { en: "Café", "pt-PT": "Café" } }],
  },
];

const mockUseCreatePlace = vi.mocked(useCreatePlace);
const mockUseUpdatePlace = vi.mocked(useUpdatePlace);

const createMutate = vi.fn();
const updateMutate = vi.fn();

function makePlace(over: Partial<PlaceRow>): PlaceRow {
  return {
    id: "p1",
    name: { en: "Place" },
    description: { en: "" },
    address: "Somewhere",
    status: "published",
    geom_lat: 0,
    geom_lng: 0,
    is_hosts_pick: false,
    source_kind: "manual",
    source_ref: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    // A real persisted place always carries at least one tag; the edit form
    // pre-fills the picker from it.
    actions: [{ action_slug: "eat", wish_slugs: ["sea-view"] }],
    ...over,
  };
}

function setCreateError(error: unknown) {
  mockUseCreatePlace.mockReturnValue({
    mutateAsync: createMutate,
    error,
  } as unknown as ReturnType<typeof useCreatePlace>);
}

// Tabs default to Portuguese (the authoring/source locale). Helpers keep the
// locale-switching explicit so each field's target locale is unambiguous.
function tab(name: "English" | "Portuguese" | "Spanish") {
  return screen.getByRole("tab", { name });
}
function nameInput() {
  return screen.getByLabelText(/name/i);
}
function descriptionInput() {
  return screen.getByLabelText(/description/i);
}
function saveButton() {
  return screen.getByRole("button", { name: /^save$/i });
}

// Picks Eat → Sea view, tolerating an already-selected state so it can be called
// on an edit form whose initialData already carries tags. Labels follow the active
// content-locale tab, so call this after the English switch in fillRequired.
function pickCategory() {
  const action = screen.getByRole("button", { name: "Eat" });
  if (action.getAttribute("aria-pressed") !== "true") fireEvent.click(action);
  const wish = screen.getByRole("button", { name: "Sea view" });
  if (wish.getAttribute("aria-pressed") !== "true") fireEvent.click(wish);
}

// Fills the required English content + address so a create/edit submit passes.
// At least one action+wish is required too — a place with no tag never reaches a
// guest, so the form refuses to save one.
function fillRequired() {
  fireEvent.click(tab("English"));
  fireEvent.change(nameInput(), { target: { value: "Cafe" } });
  fireEvent.change(descriptionInput(), { target: { value: "Nice" } });
  fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Rua X" } });
  pickCategory();
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useActionTaxonomy).mockReturnValue({
    data: TAXONOMY,
    isPending: false,
    isError: false,
  } as unknown as ReturnType<typeof useActionTaxonomy>);
  createMutate.mockResolvedValue({});
  updateMutate.mockResolvedValue({});
  mockUseCreatePlace.mockReturnValue({
    mutateAsync: createMutate,
    error: null,
  } as unknown as ReturnType<typeof useCreatePlace>);
  mockUseUpdatePlace.mockReturnValue({
    mutateAsync: updateMutate,
    error: null,
  } as unknown as ReturnType<typeof useUpdatePlace>);
});

describe("PlaceForm", () => {
  it("renders create mode with the New Place heading and default location fields", () => {
    render(<PlaceForm />);

    expect(screen.getByRole("heading", { name: "New Place" })).toBeInTheDocument();
    expect(saveButton()).toBeInTheDocument();

    // Portuguese tab is active by default; name/description start empty.
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(screen.getByLabelText(/address/i)).toHaveValue("");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(37.75);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-25.67);
  });

  it("renders the sectioned card layout", () => {
    render(<PlaceForm />);

    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Status & visibility")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Opening hours")).toBeInTheDocument();
    expect(screen.getByText("Media")).toBeInTheDocument();
  });

  it("exposes en, pt-PT and es content-locale tabs", () => {
    render(<PlaceForm />);

    expect(tab("English")).toBeInTheDocument();
    expect(tab("Portuguese")).toBeInTheDocument();
    expect(tab("Spanish")).toBeInTheDocument();
  });

  it("edits each locale independently and preserves values across tab switches", () => {
    render(<PlaceForm />);

    // Portuguese (default/source) tab.
    fireEvent.change(nameInput(), { target: { value: "Nome PT" } });

    fireEvent.click(tab("English"));
    expect(nameInput()).toHaveValue(""); // en still empty
    fireEvent.change(nameInput(), { target: { value: "Name EN" } });

    fireEvent.click(tab("Portuguese"));
    expect(nameInput()).toHaveValue("Nome PT"); // pt value preserved
  });

  it("renders edit mode seeded from initialData with the Edit Place heading", () => {
    const place = makePlace({
      id: "p1",
      name: { en: "Lagoa do Fogo", "pt-PT": "Lagoa do Fogo PT" },
      description: { en: "A crater lake", "pt-PT": "Lago de cratera" },
      address: "Caldeira, São Miguel",
      geom_lat: 37.77,
      geom_lng: -25.47,
      status: "published",
      is_hosts_pick: true,
    });

    render(<PlaceForm id="p1" initialData={place} />);

    expect(screen.getByRole("heading", { name: "Edit Place" })).toBeInTheDocument();

    // Portuguese tab is active by default → shows the pt content.
    expect(nameInput()).toHaveValue("Lagoa do Fogo PT");
    fireEvent.click(tab("English"));
    expect(nameInput()).toHaveValue("Lagoa do Fogo");
    expect(descriptionInput()).toHaveValue("A crater lake");

    expect(screen.getByLabelText(/address/i)).toHaveValue("Caldeira, São Miguel");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(37.77);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-25.47);
    expect(screen.getByLabelText(/status/i)).toHaveValue("published");
    expect(screen.getByLabelText(/host.s pick/i)).toBeChecked();
  });

  it("exposes an editable Spanish tab that round-trips name_es/description_es", async () => {
    render(<PlaceForm />);

    // English (required) content.
    fireEvent.click(tab("English"));
    fireEvent.change(nameInput(), { target: { value: "Cafe" } });
    fireEvent.change(descriptionInput(), { target: { value: "Cozy" } });

    // Spanish content — the new first-class locale.
    fireEvent.click(tab("Spanish"));
    expect(nameInput()).toHaveValue("");
    fireEvent.change(nameInput(), { target: { value: "Café ES" } });
    fireEvent.change(descriptionInput(), { target: { value: "Acogedor" } });

    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Rua X" } });
    // Seeded taxonomy labels are en + pt-PT only, so the picker falls back to the
    // English label under the Spanish tab.
    pickCategory();
    fireEvent.click(saveButton());

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { en: "Cafe", es: "Café ES" },
        description: { en: "Cozy", es: "Acogedor" },
      }),
    );
  });

  it("surfaces a required-field validation error via FormMessage", async () => {
    render(<PlaceForm />);

    fireEvent.click(saveButton());

    // name_en, description_en and address are required and empty in create mode.
    await waitFor(() => expect(screen.getAllByText("Required").length).toBeGreaterThan(0));
    expect(createMutate).not.toHaveBeenCalled();
  });

  // S6b: owner-created places used to save with zero action tags, which made them
  // invisible to every guest surface (action-scoped discovery INNER JOINs
  // place_action_wish). The picker is required precisely to make that unreachable.
  describe("action picker", () => {
    it("blocks save when no category is picked, and does not call the mutation", async () => {
      render(<PlaceForm />);
      fireEvent.click(tab("English"));
      fireEvent.change(nameInput(), { target: { value: "Cafe" } });
      fireEvent.change(descriptionInput(), { target: { value: "Nice" } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Rua X" } });

      fireEvent.click(saveButton());

      expect(await screen.findByText(/pick at least one category/i)).toBeInTheDocument();
      expect(createMutate).not.toHaveBeenCalled();
    });

    it("blocks save when an action is picked but carries no wish", async () => {
      render(<PlaceForm />);
      fireEvent.click(tab("English"));
      fireEvent.change(nameInput(), { target: { value: "Cafe" } });
      fireEvent.change(descriptionInput(), { target: { value: "Nice" } });
      fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Rua X" } });
      fireEvent.click(screen.getByRole("button", { name: "Eat" }));

      // The incomplete state is flagged inline as soon as the action is selected.
      expect(screen.getByText(/pick at least one option for eat/i)).toBeInTheDocument();

      fireEvent.click(saveButton());
      await waitFor(() => expect(createMutate).not.toHaveBeenCalled());
    });

    it("sends the picked action+wish pairs in the create body", async () => {
      render(<PlaceForm />);
      fillRequired();
      // A second action, to prove multi-select round-trips.
      fireEvent.click(screen.getByRole("button", { name: "Drink" }));
      fireEvent.click(screen.getByRole("button", { name: "Café" }));

      fireEvent.click(saveButton());

      await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          actions: [
            { action_slug: "eat", wish_slugs: ["sea-view"] },
            { action_slug: "drink", wish_slugs: ["cafe"] },
          ],
        }),
      );
    });

    it("pre-fills the picker from an existing place's tags on edit", () => {
      render(<PlaceForm id="p1" initialData={makePlace({})} />);
      fireEvent.click(tab("English"));

      expect(screen.getByRole("button", { name: "Eat" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Sea view" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: "Drink" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("deselecting an action drops it and its wishes from the body", async () => {
      render(<PlaceForm id="p1" initialData={makePlace({ name: { en: "P" } })} />);
      fillRequired();
      fireEvent.click(screen.getByRole("button", { name: "Drink" }));
      fireEvent.click(screen.getByRole("button", { name: "Café" }));
      // Now drop Eat again — Drink/Café must survive alone.
      fireEvent.click(screen.getByRole("button", { name: "Eat" }));

      fireEvent.click(saveButton());

      await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
      expect(updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ actions: [{ action_slug: "drink", wish_slugs: ["cafe"] }] }),
      );
    });
  });

  it("submitting create mode calls useCreatePlace().mutateAsync with the form body", async () => {
    render(<PlaceForm />);
    fillRequired();

    fireEvent.click(saveButton());

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { en: "Cafe" },
        description: { en: "Nice" },
        address: "Rua X",
        geom_lat: 37.75,
        geom_lng: -25.67,
        status: "draft",
        is_hosts_pick: false,
        guesthouse_scope: { all: true },
        source_kind: "manual",
        media: [],
      }),
    );
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it("submitting edit mode calls useUpdatePlace(id).mutateAsync with edited fields", async () => {
    const place = makePlace({
      id: "p1",
      name: { en: "Old Name", "pt-PT": "" },
      description: { en: "Old desc", "pt-PT": "" },
      address: "Old Address",
      status: "draft",
    });

    render(<PlaceForm id="p1" initialData={place} />);

    // The per-place mutation hook is wired with the place id.
    expect(useUpdatePlace).toHaveBeenCalledWith("p1");

    fireEvent.click(tab("English"));
    fireEvent.change(nameInput(), { target: { value: "New Name" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { en: "New Name" },
        address: "Old Address",
        status: "draft",
      }),
    );
    expect(createMutate).not.toHaveBeenCalled();
  });

  // Headline regression for PR #151: editing a place with existing media used to
  // wipe it because mediaAssets initialized to []. The form must seed the
  // uploader from initialData.media and ship those assetIds back on save.
  it("preserves existing media on edit when no new upload is added (#151 regression)", async () => {
    const place = makePlace({
      id: "p1",
      name: { en: "Has Media", "pt-PT": "" },
      description: { en: "desc", "pt-PT": "" },
      address: "Addr",
      media: [
        { id: "asset-1", kind: "image", url: "https://cdn.test/a.jpg", alt: null, sort_order: 0 },
        { id: "asset-2", kind: "image", url: "https://cdn.test/b.jpg", alt: null, sort_order: 1 },
      ],
    });

    render(<PlaceForm id="p1" initialData={place} />);

    const stub = screen.getByTestId("media-uploader-stub");
    expect(stub.getAttribute("data-initial-asset-ids")).toBe(
      JSON.stringify(["asset-1", "asset-2"]),
    );

    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ media: ["asset-1", "asset-2"] }),
    );
  });

  it("navigates to /admin/places after a successful create", async () => {
    render(<PlaceForm />);
    fillRequired();

    fireEvent.click(saveButton());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/places"));
  });

  it("renders an error alert when the mutation reports an error", () => {
    setCreateError(new Error("Boom: save rejected"));

    render(<PlaceForm />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Boom: save rejected");
  });

  describe("contacts, hours, and season controls", () => {
    it("renders contacts, hours toggles, and season in create mode", () => {
      render(<PlaceForm />);

      expect(screen.getByLabelText("Phone")).toHaveValue("");
      expect(screen.getByLabelText("Email")).toHaveValue("");
      expect(screen.getByLabelText("Website")).toHaveValue("");

      // Days start closed → per-day toggle present, time inputs hidden.
      expect(screen.getByRole("switch", { name: /toggle hours for mon/i })).toBeInTheDocument();
      expect(screen.queryByLabelText("Mon opening time")).not.toBeInTheDocument();

      // Season defaults to "All year" (empty value → null on submit).
      expect(screen.getByLabelText("Season")).toHaveValue("");
    });

    it("per-day toggle reveals time inputs with defaults and hides them again", () => {
      render(<PlaceForm />);

      const monToggle = screen.getByRole("switch", { name: /toggle hours for mon/i });
      fireEvent.click(monToggle);

      expect(screen.getByLabelText("Mon opening time")).toHaveValue("09:00");
      expect(screen.getByLabelText("Mon closing time")).toHaveValue("17:00");

      fireEvent.click(monToggle);
      expect(screen.queryByLabelText("Mon opening time")).not.toBeInTheDocument();
    });

    // A half-filled day used to be dropped by rowsToHours, so the day silently
    // persisted as CLOSED and the time the owner typed was lost with no warning.
    it("blocks save on a half-filled day instead of silently saving it closed", async () => {
      render(<PlaceForm />);
      fillRequired();

      fireEvent.click(screen.getByRole("switch", { name: /toggle hours for mon/i }));
      // Clear the closing time, leaving the day open with only an opening time.
      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "" } });

      fireEvent.click(saveButton());

      expect(
        await screen.findByText(/both opening and closing times are required/i),
      ).toBeInTheDocument();
      expect(createMutate).not.toHaveBeenCalled();
    });

    it("saves a fully-filled day and clears the half-filled error once completed", async () => {
      render(<PlaceForm />);
      fillRequired();

      fireEvent.click(screen.getByRole("switch", { name: /toggle hours for mon/i }));
      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "" } });
      fireEvent.click(saveButton());
      await screen.findByText(/both opening and closing times are required/i);

      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "18:30" } });
      fireEvent.click(saveButton());

      await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ hours: [{ dow: 1, open: "09:00", close: "18:30" }] }),
      );
    });

    // Turning 24h off used to reset the row to the 09:00–17:00 default, discarding
    // whatever the owner had before they tried it.
    it("restores the previous hours when the 24h toggle is switched back off", () => {
      render(<PlaceForm />);

      fireEvent.click(screen.getByRole("switch", { name: /toggle hours for mon/i }));
      fireEvent.change(screen.getByLabelText("Mon opening time"), { target: { value: "07:15" } });
      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "23:00" } });

      const h24 = screen.getByRole("switch", { name: /open 24h — mon/i });
      fireEvent.click(h24);
      expect(screen.getByLabelText("Mon opening time")).toHaveValue("00:00");
      expect(screen.getByLabelText("Mon closing time")).toHaveValue("23:59");

      fireEvent.click(h24);
      expect(screen.getByLabelText("Mon opening time")).toHaveValue("07:15");
      expect(screen.getByLabelText("Mon closing time")).toHaveValue("23:00");
    });

    it("restores a half-filled row through the 24h round-trip rather than defaulting", () => {
      render(<PlaceForm />);

      fireEvent.click(screen.getByRole("switch", { name: /toggle hours for mon/i }));
      fireEvent.change(screen.getByLabelText("Mon opening time"), { target: { value: "08:00" } });
      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "" } });

      const h24 = screen.getByRole("switch", { name: /open 24h — mon/i });
      fireEvent.click(h24);
      fireEvent.click(h24);

      // The typed half survives; the still-missing half re-raises the prompt,
      // which is better than quietly replacing 08:00 with the 09:00 default.
      expect(screen.getByLabelText("Mon opening time")).toHaveValue("08:00");
      expect(screen.getByLabelText("Mon closing time")).toHaveValue("");
    });

    it("falls back to the default hours when a day was already 24h on load", () => {
      render(
        <PlaceForm
          id="p1"
          initialData={makePlace({ hours: [{ dow: 1, open: "00:00", close: "23:59" }] })}
        />,
      );

      // Nothing was stashed (the 24h state came from the server), so the default
      // is the honest fallback — a blank row would read as "closed".
      fireEvent.click(screen.getByRole("switch", { name: /open 24h — mon/i }));
      expect(screen.getByLabelText("Mon opening time")).toHaveValue("09:00");
      expect(screen.getByLabelText("Mon closing time")).toHaveValue("17:00");
    });

    it("submits empty contacts, empty hours, and null season by default", async () => {
      render(<PlaceForm />);
      fillRequired();

      fireEvent.click(saveButton());

      await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ contacts: { social: [] }, hours: [], season: null }),
      );
    });

    it("carries filled contacts, hours, and season into the create body", async () => {
      render(<PlaceForm />);
      fillRequired();

      fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+351912345678" } });
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "hi@cafe.pt" } });
      fireEvent.change(screen.getByLabelText("Website"), { target: { value: "https://cafe.pt" } });

      // Open Monday, then adjust its (defaulted) times.
      fireEvent.click(screen.getByRole("switch", { name: /toggle hours for mon/i }));
      fireEvent.change(screen.getByLabelText("Mon opening time"), { target: { value: "10:00" } });
      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "18:00" } });

      fireEvent.change(screen.getByLabelText("Season"), { target: { value: "summer" } });

      fireEvent.click(saveButton());

      await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          contacts: {
            social: [],
            phone: "+351912345678",
            email: "hi@cafe.pt",
            website: "https://cafe.pt",
          },
          hours: [{ dow: 1, open: "10:00", close: "18:00" }],
          season: "summer",
        }),
      );
    });

    it("pre-fills from initialData and preserves social[] unchanged on save", async () => {
      const place = makePlace({
        id: "p1",
        name: { en: "Has Meta", "pt-PT": "" },
        description: { en: "desc", "pt-PT": "" },
        address: "Addr",
        contacts: {
          phone: "+351911111111",
          email: "old@x.pt",
          website: "https://x.pt",
          social: [{ kind: "instagram", handle: "@x" }],
        },
        hours: [{ dow: 6, open: "08:00", close: "12:00" }],
        season: "winter",
      });

      render(<PlaceForm id="p1" initialData={place} />);

      expect(screen.getByLabelText("Phone")).toHaveValue("+351911111111");
      expect(screen.getByLabelText("Email")).toHaveValue("old@x.pt");
      expect(screen.getByLabelText("Website")).toHaveValue("https://x.pt");
      // dow 6 = Saturday → its row is open and shows the persisted times.
      expect(screen.getByLabelText("Sat opening time")).toHaveValue("08:00");
      expect(screen.getByLabelText("Sat closing time")).toHaveValue("12:00");
      expect(screen.getByLabelText("Season")).toHaveValue("winter");

      fireEvent.click(saveButton());

      await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
      expect(updateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          contacts: {
            social: [{ kind: "instagram", handle: "@x" }],
            phone: "+351911111111",
            email: "old@x.pt",
            website: "https://x.pt",
          },
          hours: [{ dow: 6, open: "08:00", close: "12:00" }],
          season: "winter",
        }),
      );
    });
  });
});
