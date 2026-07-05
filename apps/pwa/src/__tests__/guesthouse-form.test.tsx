import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GuesthouseForm } from "@/features/backoffice/guesthouses/guesthouse-form";

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const MOCK_GH = {
  id: "00000000-0000-0000-0000-000000000001",
  owner_id: "owner-uuid-1",
  name: { en: "Casa das Furnas", "pt-PT": "Casa das Furnas" },
  slug: "casa-das-furnas",
  address: "Furnas, São Miguel",
  geom_lat: 37.77,
  geom_lng: -25.32,
  media: [],
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

describe("GuesthouseForm", () => {
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

  it("renders create mode with empty inputs and the New Guesthouse heading", () => {
    render(<GuesthouseForm />);

    expect(screen.getByRole("heading", { name: "New Guesthouse" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name (EN)")).toHaveValue("");
    expect(screen.getByLabelText("Name (PT)")).toHaveValue("");
    // Slug lives in the Advanced collapsible; open it before querying
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    expect(screen.getByLabelText("Slug")).toHaveValue("");
    expect(screen.getByLabelText("Address")).toHaveValue("");
  });

  it("renders edit mode with initialData seeding every field", () => {
    render(<GuesthouseForm id={MOCK_GH.id} initialData={MOCK_GH} />);

    expect(screen.getByRole("heading", { name: "Edit Guesthouse" })).toBeInTheDocument();
    expect(screen.getByLabelText("Name (EN)")).toHaveValue("Casa das Furnas");
    expect(screen.getByLabelText("Name (PT)")).toHaveValue("Casa das Furnas");
    expect(screen.getByLabelText("Slug")).toHaveValue("casa-das-furnas");
    expect(screen.getByLabelText("Address")).toHaveValue("Furnas, São Miguel");
    expect(screen.getByLabelText("Latitude")).toHaveValue(37.77);
    expect(screen.getByLabelText("Longitude")).toHaveValue(-25.32);
  });

  it("switching to the PT-PT tab reveals name_pt and hides the EN content", () => {
    render(<GuesthouseForm />);

    const enWrapper = screen.getByLabelText("Name (EN)").closest("div")!;
    const ptWrapper = screen.getByLabelText("Name (PT)").closest("div")!;

    expect(enWrapper).not.toHaveClass("hidden");
    expect(ptWrapper).toHaveClass("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Portuguese" }));

    expect(enWrapper).toHaveClass("hidden");
    expect(ptWrapper).not.toHaveClass("hidden");
  });

  it("shows Required validation under name_en and address when submitting empty", async () => {
    render(<GuesthouseForm />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getAllByText("Required")).toHaveLength(2);
    });
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("rejects an invalid slug with the kebab-case error message", async () => {
    render(<GuesthouseForm />);

    fireEvent.change(screen.getByLabelText("Name (EN)"), { target: { value: "Casa Nova" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Furnas" } });
    // Slug lives in the Advanced collapsible; open it before interacting
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "Not A Slug" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("lowercase kebab-case slug")).toBeInTheDocument();
    });
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("submits create mode with the form body, coercing lat/lng to numbers", async () => {
    render(<GuesthouseForm />);

    fireEvent.change(screen.getByLabelText("Name (EN)"), { target: { value: "Casa Nova" } });
    fireEvent.change(screen.getByLabelText("Name (PT)"), { target: { value: "Casa Nova PT" } });
    // Slug lives in the Advanced collapsible; open it before interacting
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "casa-furnas" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Furnas" } });
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "38.5" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "-25.1" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        name: { en: "Casa Nova", "pt-PT": "Casa Nova PT" },
        slug: "casa-furnas",
        address: "Furnas",
        geom_lat: 38.5,
        geom_lng: -25.1,
        media: [],
      });
    });
  });

  it("submits edit mode via useUpdateGuesthouse(id) with a body that excludes id", async () => {
    render(<GuesthouseForm id={MOCK_GH.id} initialData={MOCK_GH} />);

    expect(mockUpdate).toHaveBeenCalledWith(MOCK_GH.id);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        name: { en: "Casa das Furnas", "pt-PT": "Casa das Furnas" },
        slug: "casa-das-furnas",
        address: "Furnas, São Miguel",
        geom_lat: 37.77,
        geom_lng: -25.32,
        media: [],
      });
    });
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("navigates to /admin/guesthouses after a successful create", async () => {
    render(<GuesthouseForm />);

    fireEvent.change(screen.getByLabelText("Name (EN)"), { target: { value: "Casa Nova" } });
    // Slug lives in the Advanced collapsible; open it before interacting
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    fireEvent.change(screen.getByLabelText("Slug"), { target: { value: "casa-furnas" } });
    fireEvent.change(screen.getByLabelText("Address"), { target: { value: "Furnas" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin/guesthouses");
    });
  });

  it("renders an alert with the mutation error message", () => {
    setMutationError("create", new Error("create guesthouse 500"));

    render(<GuesthouseForm />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("create guesthouse 500");
  });

  it("renders the hero image from media[0] via the display route", () => {
    const heroId = "11111111-1111-4111-8111-111111111111";
    render(<GuesthouseForm id={MOCK_GH.id} initialData={{ ...MOCK_GH, media: [heroId] }} />);

    const hero = screen.getByRole("img", { name: "Guesthouse hero" });
    expect(hero.getAttribute("src")).toBe(`/v1/media/${heroId}`);
  });

  it("renders no hero image when media is empty", () => {
    render(<GuesthouseForm id={MOCK_GH.id} initialData={MOCK_GH} />);
    expect(screen.queryByRole("img", { name: "Guesthouse hero" })).toBeNull();
  });

  it("includes the seeded media in the edit submit body", async () => {
    const heroId = "11111111-1111-4111-8111-111111111111";
    render(<GuesthouseForm id={MOCK_GH.id} initialData={{ ...MOCK_GH, media: [heroId] }} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ media: [heroId] }));
    });
  });
});
