import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlaceForm } from "@/features/backoffice/places/place-form";
import type { PlaceRow } from "@/features/backoffice/places/use-places";

// Navigation: mock useNavigate so the form needs no Router provider and we can
// assert post-submit redirects.
const mockNavigate = vi.fn();
vi.mock("react-router", async (importActual) => {
  const actual = await importActual<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
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

// Mutation hooks: controlled mutateAsync mocks so we can assert the submit body
// and inject errors without touching fetch.
vi.mock("@/features/backoffice/places/use-places", () => ({
  useCreatePlace: vi.fn(),
  useUpdatePlace: vi.fn(),
}));

const { useCreatePlace, useUpdatePlace } = await import("@/features/backoffice/places/use-places");

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
    ...over,
  };
}

function setCreateError(error: unknown) {
  mockUseCreatePlace.mockReturnValue({
    mutateAsync: createMutate,
    error,
  } as unknown as ReturnType<typeof useCreatePlace>);
}

beforeEach(() => {
  vi.clearAllMocks();
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
  it("renders create mode with empty inputs and the New Place heading", () => {
    render(<PlaceForm />);

    expect(screen.getByRole("heading", { name: "New Place" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();

    // Translation fields start empty; lat/lng carry create-mode defaults.
    expect(screen.getByLabelText(/name \(en\)/i)).toHaveValue("");
    expect(screen.getByLabelText(/description \(en\)/i)).toHaveValue("");
    expect(screen.getByLabelText(/^address$/i)).toHaveValue("");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(37.75);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-25.67);
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

    expect(screen.getByLabelText(/name \(en\)/i)).toHaveValue("Lagoa do Fogo");
    expect(screen.getByLabelText(/name \(pt\)/i)).toHaveValue("Lagoa do Fogo PT");
    expect(screen.getByLabelText(/description \(en\)/i)).toHaveValue("A crater lake");
    expect(screen.getByLabelText(/^address$/i)).toHaveValue("Caldeira, São Miguel");
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(37.77);
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(-25.47);
    expect(screen.getByLabelText(/status/i)).toHaveValue("published");
    expect(screen.getByLabelText(/host.s pick/i)).toBeChecked();
  });

  it("switching to the pt-PT tab reveals the PT inputs and hides the EN content", () => {
    render(<PlaceForm />);

    const enContainer = screen.getByLabelText(/name \(en\)/i).closest("label")!.parentElement!;
    const ptContainer = screen.getByLabelText(/name \(pt\)/i).closest("label")!.parentElement!;

    // EN active by default.
    expect(enContainer).not.toHaveClass("hidden");
    expect(ptContainer).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: /portuguese/i }));

    expect(enContainer).toHaveClass("hidden");
    expect(ptContainer).not.toHaveClass("hidden");
  });

  it("surfaces zod required-field errors when submitting an empty create form", async () => {
    render(<PlaceForm />);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    // name_en, description_en, address are required and empty in create mode;
    // name_pt/description_pt default to "" and lat/lng have defaults, so no error.
    await waitFor(() => {
      expect(screen.getAllByText("Required")).toHaveLength(3);
    });
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("submitting create mode calls useCreatePlace().mutateAsync with the form body", async () => {
    render(<PlaceForm />);

    fireEvent.change(screen.getByLabelText(/name \(en\)/i), { target: { value: "Cafe Royal" } });
    fireEvent.change(screen.getByLabelText(/description \(en\)/i), {
      target: { value: "Cozy spot" },
    });
    fireEvent.change(screen.getByLabelText(/^address$/i), { target: { value: "Rua das Flores" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { en: "Cafe Royal", "pt-PT": "" },
        description: { en: "Cozy spot", "pt-PT": "" },
        address: "Rua das Flores",
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

    fireEvent.change(screen.getByLabelText(/name \(en\)/i), { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: { en: "New Name", "pt-PT": "" },
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

    // The form threads the seeded assets into the uploader.
    const stub = screen.getByTestId("media-uploader-stub");
    expect(stub.getAttribute("data-initial-asset-ids")).toBe(
      JSON.stringify(["asset-1", "asset-2"]),
    );

    // Submitting without touching the uploader must NOT drop the media.
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ media: ["asset-1", "asset-2"] }),
    );
  });

  it("navigates to /admin/places after a successful create", async () => {
    render(<PlaceForm />);

    fireEvent.change(screen.getByLabelText(/name \(en\)/i), { target: { value: "Cafe" } });
    fireEvent.change(screen.getByLabelText(/description \(en\)/i), { target: { value: "Nice" } });
    fireEvent.change(screen.getByLabelText(/^address$/i), { target: { value: "Rua X" } });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/admin/places"));
  });

  it("renders an error alert when the mutation reports an error", () => {
    setCreateError(new Error("Boom: save rejected"));

    render(<PlaceForm />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Boom: save rejected");
  });

  describe("contacts, hours, and season controls", () => {
    function fillRequired() {
      fireEvent.change(screen.getByLabelText(/name \(en\)/i), { target: { value: "Cafe" } });
      fireEvent.change(screen.getByLabelText(/description \(en\)/i), { target: { value: "Nice" } });
      fireEvent.change(screen.getByLabelText(/^address$/i), { target: { value: "Rua X" } });
    }

    it("renders the new fieldsets in create mode", () => {
      render(<PlaceForm />);

      expect(screen.getByLabelText("Phone")).toHaveValue("");
      expect(screen.getByLabelText("Email")).toHaveValue("");
      expect(screen.getByLabelText("Website")).toHaveValue("");
      // 7 day rows × open+close = 14 time inputs.
      expect(screen.getByLabelText("Mon opening time")).toBeInTheDocument();
      expect(screen.getByLabelText("Sun closing time")).toBeInTheDocument();
      // Season defaults to "All year" (empty value → null on submit).
      expect(screen.getByLabelText("Season")).toHaveValue("");
    });

    it("submits empty contacts, empty hours, and null season by default", async () => {
      render(<PlaceForm />);
      fillRequired();

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

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

      // Monday gets full hours; Sunday only opens → dropped (needs both).
      fireEvent.change(screen.getByLabelText("Mon opening time"), { target: { value: "09:00" } });
      fireEvent.change(screen.getByLabelText("Mon closing time"), { target: { value: "17:00" } });
      fireEvent.change(screen.getByLabelText("Sun opening time"), { target: { value: "10:00" } });

      fireEvent.change(screen.getByLabelText("Season"), { target: { value: "summer" } });

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

      await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          contacts: {
            social: [],
            phone: "+351912345678",
            email: "hi@cafe.pt",
            website: "https://cafe.pt",
          },
          hours: [{ dow: 1, open: "09:00", close: "17:00" }],
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
      // dow 6 = Saturday in the display map.
      expect(screen.getByLabelText("Sat opening time")).toHaveValue("08:00");
      expect(screen.getByLabelText("Sat closing time")).toHaveValue("12:00");
      expect(screen.getByLabelText("Season")).toHaveValue("winter");

      fireEvent.click(screen.getByRole("button", { name: /save/i }));

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
