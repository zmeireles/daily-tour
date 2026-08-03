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

  // #380 regression guards. The banner is z-50 and pinned to bottom-0; the tab
  // bar and discover sheet are z-30 and pinned to the same edge. Measured on a
  // 390px phone before the fix: all four nav tabs and the chat Send button had
  // their centres covered, so a guest's first visit had no working navigation
  // and a thumb aimed at a place card could land on Accept/Decline. The banner
  // now publishes its height and the bottom-pinned surfaces lift clear of it.
  //
  // jsdom does no layout, so getBoundingClientRect is 0 — these assert the
  // publish/clear LIFECYCLE, which is where the real trap is.
  describe("bottom inset (#380)", () => {
    const inset = () => document.documentElement.style.getPropertyValue("--bottom-inset");

    afterEach(() => {
      document.documentElement.style.removeProperty("--bottom-inset");
    });

    it("publishes --bottom-inset while the banner is up", () => {
      renderBanner();
      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(inset()).not.toBe("");
    });

    it("clears the inset once the guest answers, without unmounting", () => {
      renderBanner();
      expect(inset()).not.toBe("");

      fireEvent.click(screen.getByText("Decline"));

      // The banner returns null rather than unmounting its parent. A ref going
      // null does NOT re-run an effect, so an inset keyed only on the ref would
      // stay stuck here — permanently indenting the layout for a banner that is
      // gone. This is the assertion that catches that.
      expect(screen.queryByRole("region")).toBeNull();
      expect(inset()).toBe("");
    });

    it("publishes nothing on /admin, where the banner never shows", () => {
      setPath("/admin/places");
      renderBanner();
      expect(inset()).toBe("");
    });
  });
});
