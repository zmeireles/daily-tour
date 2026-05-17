import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "@/lib/i18n";
import { ShareButton } from "@/features/tour/share-button";

vi.mock("@/lib/theme/use-theme-auto", () => ({ useThemeAuto: vi.fn() }));
vi.mock("@/lib/locale/use-locale-auto", () => ({ useLocaleAuto: vi.fn() }));

const PLAN_ID = "eeeeeeee-0000-4000-8000-000000000001";

function renderShareButton() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ShareButton planId={PLAN_ID} />
    </QueryClientProvider>,
  );
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
