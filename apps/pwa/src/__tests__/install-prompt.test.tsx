import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { InstallBanner } from "@/features/pwa-install/install-banner";
import { type BeforeInstallPromptEvent, useInstallPromptStore } from "@/lib/pwa/install-prompt";

// Reset store + localStorage between tests
beforeEach(() => {
  localStorage.clear();
  useInstallPromptStore.setState({ deferredPrompt: null, visitCount: 0 });
});

function makeInstallEvent(): BeforeInstallPromptEvent {
  const evt = new Event("beforeinstallprompt", { bubbles: true, cancelable: true });
  Object.assign(evt, {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "accepted" }),
  });
  return evt as BeforeInstallPromptEvent;
}

describe("InstallBanner", () => {
  it("first visit — banner is not rendered", () => {
    // No prior entry in localStorage → hook increments to 1 → visitCount=1 < 2 → no banner
    render(<InstallBanner />);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("second visit with beforeinstallprompt event — banner shows", () => {
    // Simulate one prior visit so the hook sets visitCount=2 on mount
    localStorage.setItem("pwa_visit_count", "1");

    render(<InstallBanner />);

    // Dispatch the event — hook listener fires and stores the deferred prompt
    act(() => {
      window.dispatchEvent(makeInstallEvent());
    });

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(screen.getByText("Install Daily Tour")).toBeInTheDocument();
    expect(screen.getByText("Add to your home screen for instant access.")).toBeInTheDocument();
  });

  it("dismiss — banner unmounts and stays gone", () => {
    localStorage.setItem("pwa_visit_count", "1");

    const { rerender } = render(<InstallBanner />);

    act(() => {
      window.dispatchEvent(makeInstallEvent());
    });

    expect(screen.getByRole("region")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Not now"));

    // deferredPrompt cleared → canInstall false → banner gone
    expect(screen.queryByRole("region")).toBeNull();

    rerender(<InstallBanner />);
    expect(screen.queryByRole("region")).toBeNull();
  });
});
