import * as React from "react";
import { ENGAGE_WIDTH, type LayoutEngageAt } from "@/lib/responsive/breakpoints";

export type LayoutMode = "mobile" | "desktop";

// Single breakpoint authority for the desktop fork. Returns 'desktop' once the
// viewport reaches the engage width (lg/1024 by default; md/768 opt-in for the
// screens already broken at tablet width). Uses useSyncExternalStore so there is
// no first-paint flash, and defaults to 'mobile' on the server / where matchMedia
// is unavailable (jsdom) — a phone never flashes desktop DOM.
export function useLayoutMode(engageAt: LayoutEngageAt = "lg"): LayoutMode {
  const query = `(min-width: ${ENGAGE_WIDTH[engageAt]}px)`;

  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  const isDesktop = React.useSyncExternalStore(
    subscribe,
    () =>
      typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false,
    () => false,
  );

  return isDesktop ? "desktop" : "mobile";
}
