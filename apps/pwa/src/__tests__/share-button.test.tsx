import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { ShareButton } from "@/features/tour/share-button";
import { useSessionStore } from "@/store/session";

vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));

const PLAN_ID = "eeeeeeee-0000-4000-8000-000000000001";

function renderShareButton(props: { sharedAt?: string | null } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ShareButton planId={PLAN_ID} sharedAt={props.sharedAt} />
    </QueryClientProvider>,
  );
}

// The two original tests run with NO session, which is exactly why they kept
// passing when sharing became a server call — the grant path is skipped without
// a jwt. These helpers drive the path that actually matters.
function signIn() {
  useSessionStore.setState({ jwt: "test-jwt" });
}

describe("ShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    void i18n.changeLanguage("en");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls navigator.share when Web Share API is available", async () => {
    const shareSpy = vi.fn().mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });

    renderShareButton();
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      const arg = shareSpy.mock.calls[0]?.[0] as { url: string } | undefined;
      expect(arg?.url).toContain(PLAN_ID);
    });
  });

  it("copies URL to clipboard and shows feedback when Web Share API is unavailable", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const writeTextSpy = vi.fn().mockResolvedValueOnce(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    renderShareButton();
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalledWith(expect.stringContaining(PLAN_ID));
    });

    expect(screen.getByText(/link copied/i)).toBeInTheDocument();
  });
});

// ── dt-tests #40 — sharing is now a GRANT, not just a URL ───────────────────
// Every test here fails against the pre-#40 button, which never called the
// server at all.
describe("ShareButton — explicit sharing (dt-tests #40)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    void i18n.changeLanguage("en");
    signIn();
  });

  afterEach(() => {
    useSessionStore.setState({ jwt: null });
    vi.restoreAllMocks();
  });

  it("grants access on the server BEFORE handing out the link", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ id: PLAN_ID, status: "ready", shared_at: "2026-08-24T09:00:00Z" }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });

    renderShareButton();
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => expect(shareSpy).toHaveBeenCalled());

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/v1/tour-plans/${PLAN_ID}/share`);
    expect(init.method).toBe("POST");
  });

  it("does NOT hand out a link when the grant fails", async () => {
    // The failure that matters: a link shared while the plan is still private
    // 404s for whoever receives it. Better to do nothing than to share a
    // broken link.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareSpy, configurable: true });
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    renderShareButton();
    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    // Control: the success case above proves this spy DOES fire when the grant
    // works, so its silence here is a real absence.
    await waitFor(() => expect(screen.getByRole("button", { name: /share/i })).toBeEnabled());
    expect(shareSpy).not.toHaveBeenCalled();
    expect(writeTextSpy).not.toHaveBeenCalled();
  });

  it("offers no revoke control while the plan is private", () => {
    renderShareButton({ sharedAt: null });
    expect(screen.queryByRole("button", { name: /stop sharing/i })).toBeNull();
  });

  it("offers revoke once shared, and DELETEs the grant", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: PLAN_ID, status: "ready", shared_at: null }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    renderShareButton({ sharedAt: "2026-08-24T09:00:00Z" });
    fireEvent.click(screen.getByRole("button", { name: /stop sharing/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/v1/tour-plans/${PLAN_ID}/share`);
    expect(init.method).toBe("DELETE");
  });
});
