import * as React from "react";
import { useLayoutMode } from "@/lib/responsive/use-layout-mode";
import { type LayoutEngageAt } from "@/lib/responsive/breakpoints";

// The single auditable surface for the mobile/desktop fork. Mounts EITHER the
// mobile OR the desktop tree (a true component swap — never both DOM trees with
// one hidden by CSS), at the engageAt breakpoint. Below the floor a phone is
// guaranteed the untouched mobile tree, so mobile cannot regress.
//
//   <ResponsiveScreen engageAt="md" mobile={<Home />} desktop={<HomeDesktop />} />
//
// engageAt defaults to "lg" (1024 hard floor); pass "md" only for the screens
// already broken at tablet width (Home, Daily Tour).
export function ResponsiveScreen({
  mobile,
  desktop,
  engageAt = "lg",
}: {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
  engageAt?: LayoutEngageAt;
}) {
  const mode = useLayoutMode(engageAt);
  return <>{mode === "desktop" ? desktop : mobile}</>;
}
