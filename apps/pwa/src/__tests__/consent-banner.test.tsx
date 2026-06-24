import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConsentBanner } from "@/components/consent-banner";
import { useConsentStore } from "@/lib/consent/use-consent";

function renderBanner() {
  return render(<ConsentBanner />);
}

describe("ConsentBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    useConsentStore.setState({ analytics: "unset" });
  });

  it("renders for undecided users with both choices and a learn-more link", () => {
    renderBanner();

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
    const link = screen.getByText("Learn more");
    expect(link).toHaveAttribute("href", "/privacy");
  });

  it("does not render once a decision has been made", () => {
    useConsentStore.setState({ analytics: "granted" });
    renderBanner();
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("Accept sets consent to granted and dismisses the banner", () => {
    renderBanner();

    fireEvent.click(screen.getByText("Accept"));

    expect(useConsentStore.getState().analytics).toBe("granted");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("Decline sets consent to denied and dismisses the banner", () => {
    renderBanner();

    fireEvent.click(screen.getByText("Decline"));

    expect(useConsentStore.getState().analytics).toBe("denied");
    expect(screen.queryByRole("region")).toBeNull();
  });
});
