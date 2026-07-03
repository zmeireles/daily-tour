import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConsentBanner } from "@/components/consent-banner";
import { useConsentStore } from "@/lib/consent/use-consent";

function renderBanner() {
  return render(<ConsentBanner />);
}

function setPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
}

describe("ConsentBanner", () => {
  beforeEach(() => {
    localStorage.clear();
    useConsentStore.setState({ analytics: "unset" });
    setPath("/");
  });

  it("renders for undecided users with both choices and a privacy-policy link", () => {
    renderBanner();

    expect(screen.getByRole("region")).toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
    const link = screen.getByText("Read our privacy policy");
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

  describe("admin-path gating (T-8.0.3)", () => {
    afterEach(() => {
      setPath("/");
    });

    it("does not render on /admin even when consent is unset", () => {
      setPath("/admin");
      renderBanner();
      expect(screen.queryByRole("region")).toBeNull();
    });

    it("does not render on /admin/* sub-routes", () => {
      setPath("/admin/places");
      renderBanner();
      expect(screen.queryByRole("region")).toBeNull();
    });

    it("still renders on guest routes when consent is unset", () => {
      setPath("/p/some-place");
      renderBanner();
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });
});
