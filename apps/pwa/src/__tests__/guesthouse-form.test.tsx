import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuesthouseForm } from "@/features/backoffice/guesthouses/guesthouse-form";
import type { GuesthouseRow } from "@/features/backoffice/guesthouses/use-guesthouses";

// Navigation: mock useNavigate so the form needs no Router provider, and stub
// useBlocker (the dirty-guard) since there's no data router in these tests.
const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useBlocker: () => ({ state: "unblocked", proceed: undefined, reset: undefined }),
  };
});

// MediaUploader: stub it so these tests don't depend on useOwnerJwt or the upload
// signing chain. The stub re-exposes the initialAssets the form threads in via a
// data attribute — the load-bearing assertion that existing media is preserved.
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
// TranslatableField renders offline.
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
vi.mock("@/features/backoffice/guesthouses/use-guesthouses", () => ({
  useCreateGuesthouse: vi.fn(),
  useUpdateGuesthouse: vi.fn(),
}));

const { useCreateGuesthouse, useUpdateGuesthouse } =
  await import("@/features/backoffice/guesthouses/use-guesthouses");
const mockCreate = vi.mocked(useCreateGuesthouse);
const mockUpdate = vi.mocked(useUpdateGuesthouse);

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

const MOCK_GH: GuesthouseRow = {
  id: "00000000-0000-0000-0000-000000000001",
  owner_id: "owner-uuid-1",
  name: { en: "Casa das Furnas", "pt-PT": "Casa das Furnas" },
  slug: "casa-das-furnas",
  address: "Furnas, São Miguel",
  geom_lat: 37.77,
  geom_lng: -25.32,
  media: [],
  status: "active",
  rooms: 4,
  hidden_place_ids: [],
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

function setMutationError(which: "create" | "update", error: unknown) {
  const target = which === "create" ? mockCreate : mockUpdate;
  const mutateAsync = which === "create" ? createMutateAsync : updateMutateAsync;
  target.mockReturnValue({
    mutateAsync,
    error,
  } as unknown as ReturnType<typeof useCreateGuesthouse>);
}

// Tabs default to Portuguese (the authoring/source locale). Helpers keep the
// locale-switching explicit so each field's target locale is unambiguous.
function tab(name: "English" | "Portuguese" | "Spanish") {
  return screen.getByRole("tab", { name });
}
function nameInput() {
  return screen.getByLabelText(/name/i);
}
function saveButton() {
  return screen.getByRole("button", { name: /^save$/i });
}
// Slug lives in the "Advanced" section. It's collapsed by default in create
// mode but opens automatically in edit mode when a slug already exists, so only
// toggle it when the Slug field isn't already visible.
function openAdvanced() {
  if (!screen.queryByLabelText("Slug")) {
    fireEvent.click(screen.getByRole("button", { name: /slug/i }));
  }
}

// Fills the required English name + address so a create/edit submit passes.
function fillRequired() {
  fireEvent.click(tab("English"));
  fireEvent.change(nameInput(), { target: { value: "Casa Nova" } });
  fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Furnas" } });
}

beforeEach(() => {
  vi.clearAllMocks();
  createMutateAsync.mockResolvedValue({});
  updateMutateAsync.mockResolvedValue({});
  mockCreate.mockReturnValue({
    mutateAsync: createMutateAsync,
    error: null,
  } as unknown as ReturnType<typeof useCreateGuesthouse>);
  mockUpdate.mockReturnValue({
    mutateAsync: updateMutateAsync,
    error: null,
  } as unknown as ReturnType<typeof useUpdateGuesthouse>);
});

describe("GuesthouseForm", () => {
  it("renders create mode with the New Guesthouse heading and default location fields", () => {
    render(<GuesthouseForm />);

    expect(screen.getByRole("heading", { name: "New Guesthouse" })).toBeInTheDocument();
    expect(saveButton()).toBeInTheDocument();

    // Portuguese tab is active by default; name starts empty.
    expect(nameInput()).toHaveValue("");
    expect(screen.getByLabelText(/address/i)).toHaveValue("");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(37.75);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-25.67);
  });

  it("renders the sectioned card layout", () => {
    render(<GuesthouseForm />);

    expect(screen.getByText("Identity")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    // Status section: unambiguous via the labelled select.
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Rooms")).toBeInTheDocument();
  });

  it("exposes en, pt-PT and es content-locale tabs", () => {
    render(<GuesthouseForm />);

    expect(tab("English")).toBeInTheDocument();
    expect(tab("Portuguese")).toBeInTheDocument();
    expect(tab("Spanish")).toBeInTheDocument();
  });

  it("edits each locale independently and preserves values across tab switches", () => {
    render(<GuesthouseForm />);

    // Portuguese (default/source) tab.
    fireEvent.change(nameInput(), { target: { value: "Nome PT" } });

    fireEvent.click(tab("English"));
    expect(nameInput()).toHaveValue(""); // en still empty
    fireEvent.change(nameInput(), { target: { value: "Name EN" } });

    fireEvent.click(tab("Portuguese"));
    expect(nameInput()).toHaveValue("Nome PT"); // pt value preserved
  });

  it("renders edit mode seeded from initialData with the Edit Guesthouse heading", () => {
    render(<GuesthouseForm id={MOCK_GH.id} initialData={MOCK_GH} />);

    expect(screen.getByRole("heading", { name: "Edit Guesthouse" })).toBeInTheDocument();

    // Portuguese tab is active by default → shows the pt name.
    expect(nameInput()).toHaveValue("Casa das Furnas");
    fireEvent.click(tab("English"));
    expect(nameInput()).toHaveValue("Casa das Furnas");

    expect(screen.getByLabelText(/address/i)).toHaveValue("Furnas, São Miguel");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(37.77);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-25.32);
    expect(screen.getByLabelText("Status")).toHaveValue("active");
    expect(screen.getByLabelText("Rooms")).toHaveValue(4);

    // Slug is demoted into the Advanced collapsible.
    openAdvanced();
    expect(screen.getByLabelText("Slug")).toHaveValue("casa-das-furnas");
  });

  it("exposes an editable Spanish tab that round-trips name_es in the submit body", async () => {
    render(<GuesthouseForm />);

    // English (required) name.
    fireEvent.click(tab("English"));
    fireEvent.change(nameInput(), { target: { value: "Casa Nova" } });

    // Spanish name — the new first-class locale.
    fireEvent.click(tab("Spanish"));
    expect(nameInput()).toHaveValue("");
    fireEvent.change(nameInput(), { target: { value: "Casa ES" } });

    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Furnas" } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ name: { en: "Casa Nova", es: "Casa ES" } }),
    );
  });

  it("surfaces required-field validation errors via FormMessage", async () => {
    render(<GuesthouseForm />);

    fireEvent.click(saveButton());

    // name_en and address are required and empty in create mode; the invalid
    // handler switches to the EN tab so the hidden name error is visible.
    await waitFor(() => expect(screen.getAllByText("Required").length).toBeGreaterThanOrEqual(2));
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("rejects an invalid slug with the kebab-case error message", async () => {
    render(<GuesthouseForm />);

    fillRequired();
    openAdvanced();
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "Not A Slug" } });

    fireEvent.click(saveButton());

    await waitFor(() => expect(screen.getByText("lowercase kebab-case slug")).toBeInTheDocument());
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("submits create mode auto-deriving the slug from the name when left blank", async () => {
    render(<GuesthouseForm />);
    fillRequired();

    fireEvent.click(saveButton());

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { en: "Casa Nova" },
        slug: "casa-nova",
        address: "Furnas",
        geom_lat: 37.75,
        geom_lng: -25.67,
        media: [],
        status: "active",
        rooms: null,
      }),
    );
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  // slugify() keeps only [a-z0-9], so a name with no Latin characters at all —
  // all-punctuation, or e.g. "Ξενώνας" — reduced to "" and catalog-svc answered
  // with an opaque 400 the owner could do nothing with.
  it("falls back to a generated slug when the name yields no slug characters", async () => {
    render(<GuesthouseForm />);
    fireEvent.click(tab("English"));
    fireEvent.change(nameInput(), { target: { value: "!!!😀!!!" } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: "Furnas" } });

    fireEvent.click(saveButton());

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const body = createMutateAsync.mock.calls[0]![0] as { slug: string };
    expect(body.slug).toMatch(/^guesthouse-[a-z0-9]{1,6}$/);
  });

  it("uses an explicit slug verbatim when the owner types one", async () => {
    render(<GuesthouseForm />);
    fillRequired();
    openAdvanced();
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "casa-furnas" } });

    fireEvent.click(saveButton());

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "casa-furnas" }),
    );
  });

  it("submits edit mode via useUpdateGuesthouse(id) with a body that excludes id", async () => {
    render(<GuesthouseForm id={MOCK_GH.id} initialData={MOCK_GH} />);

    expect(mockUpdate).toHaveBeenCalledWith(MOCK_GH.id);

    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync).toHaveBeenCalledWith({
      name: { en: "Casa das Furnas", "pt-PT": "Casa das Furnas" },
      slug: "casa-das-furnas",
      address: "Furnas, São Miguel",
      geom_lat: 37.77,
      geom_lng: -25.32,
      media: [],
      status: "active",
      rooms: 4,
    });
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("submits status and rooms changes in the update body", async () => {
    render(<GuesthouseForm id={MOCK_GH.id} initialData={MOCK_GH} />);

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "archived" } });
    fireEvent.change(screen.getByLabelText("Rooms"), { target: { value: "8" } });

    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ status: "archived", rooms: 8 }),
      ),
    );
  });

  it("navigates to /admin/guesthouses after a successful create", async () => {
    render(<GuesthouseForm />);
    fillRequired();

    fireEvent.click(saveButton());

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/guesthouses"));
  });

  it("renders an alert with the mutation error message", () => {
    setMutationError("create", new Error("create guesthouse 500"));

    render(<GuesthouseForm />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("create guesthouse 500");
  });

  it("seeds the media uploader from initialData and ships those assetIds on save", async () => {
    const heroId = "11111111-1111-4111-8111-111111111111";
    render(<GuesthouseForm id={MOCK_GH.id} initialData={{ ...MOCK_GH, media: [heroId] }} />);

    const stub = screen.getByTestId("media-uploader-stub");
    expect(stub.getAttribute("data-initial-asset-ids")).toBe(JSON.stringify([heroId]));

    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ media: [heroId] })),
    );
  });
});
