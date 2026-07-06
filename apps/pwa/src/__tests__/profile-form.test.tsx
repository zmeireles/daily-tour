import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfileForm } from "@/features/backoffice/profile/profile-form";
import type { OwnerProfile } from "@/features/backoffice/profile/use-profile";

// Mutation hook is mocked — no network, assert on the submitted body directly.
vi.mock("@/features/backoffice/profile/use-profile", () => ({
  useUpsertProfile: vi.fn(),
}));

// Pass-through the translation controller so the globe never hits /v1/admin/translate.
vi.mock("@/lib/i18n/use-field-translation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n/use-field-translation")>();
  return {
    ...actual,
    useFieldTranslation: () => ({
      translateField: vi.fn().mockResolvedValue(false),
      translateAll: vi.fn().mockResolvedValue(undefined),
      status: () => ({ translating: false, autoTranslated: false, outOfSync: false }),
      _notifyEdit: vi.fn(),
    }),
  };
});

const { useUpsertProfile } = await import("@/features/backoffice/profile/use-profile");
const mockUpsert = vi.mocked(useUpsertProfile);
const mutateAsync = vi.fn();

const MOCK_PROFILE: OwnerProfile = {
  owner_id: "owner-uuid-1",
  bio: { en: "EN bio", "pt-PT": "PT bio", es: "ES bio" },
  photo: null,
  phone: "912345678",
  call_enabled: false,
  dm_channels: { in_app: true, telegram: false, whatsapp_link: false, whatsapp_cloud: false },
  email: "host@example.com",
  updated_at: "2025-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({});
  mockUpsert.mockReturnValue({
    mutateAsync,
    isPending: false,
    isSuccess: false,
    error: null,
  } as unknown as ReturnType<typeof useUpsertProfile>);
});

describe("ProfileForm", () => {
  it("opens with the Portuguese Bio tab active by default", () => {
    render(<ProfileForm />);

    expect(screen.getByRole("tab", { name: "Portuguese" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("data-state", "inactive");
    expect(screen.getByRole("tab", { name: "Spanish" })).toHaveAttribute("data-state", "inactive");
    // The single mounted Bio field is the PT one.
    expect(screen.getByLabelText("Bio")).toBeInTheDocument();
  });

  it("makes the Spanish Bio (bio_es) tab editable", () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);

    // PT is active, so the PT bio shows first.
    expect(screen.getByLabelText("Bio")).toHaveValue("PT bio");

    // Radix Tabs activate on mousedown (not click) under jsdom.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Spanish" }));

    const es = screen.getByLabelText("Bio");
    expect(es).toHaveValue("ES bio");
    fireEvent.change(es, { target: { value: "Hola, soy tu anfitrión" } });
    expect(es).toHaveValue("Hola, soy tu anfitrión");
  });

  it("renders the language-invariant fields once, outside the locale tabs", () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);

    expect(screen.getAllByLabelText("Phone")).toHaveLength(1);
    expect(screen.getAllByLabelText("Email")).toHaveLength(1);
    expect(screen.getAllByRole("switch")).toHaveLength(5);

    // Switching the Bio locale tab must not add or remove them.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "English" }));
    expect(screen.getAllByLabelText("Phone")).toHaveLength(1);
    expect(screen.getAllByLabelText("Email")).toHaveLength(1);
    expect(screen.getAllByRole("switch")).toHaveLength(5);
  });

  it("uses plain language — no 'Cloud API' jargon anywhere", () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);

    expect(screen.queryByText(/Cloud API/i)).toBeNull();
    expect(screen.getByText("WhatsApp Business")).toBeInTheDocument();
  });

  it("toggles a brand switch on click", () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);

    const callSwitch = screen.getByRole("switch", { name: "Allow calls" });
    expect(callSwitch).toHaveAttribute("aria-checked", "false");
    fireEvent.click(callSwitch);
    expect(callSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("shows an inline error for an invalid email and blocks the save", async () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("submits the profile with bio { en, pt-PT, es } and the shared fields", async () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);

    // Dirty the form (Save is guarded by formState.isDirty).
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "919999999" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          bio: { en: "EN bio", "pt-PT": "PT bio", es: "ES bio" },
          phone: "919999999",
          email: "host@example.com",
          call_enabled: false,
          dm_channels: {
            in_app: true,
            telegram: false,
            whatsapp_link: false,
            whatsapp_cloud: false,
          },
        }),
      );
    });
  });

  it("keeps the Save button disabled until the form is dirty", () => {
    render(<ProfileForm initialData={MOCK_PROFILE} />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "919999999" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
