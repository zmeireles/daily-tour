import { Utensils, Wine, Eye, Footprints, ShoppingBag, Car, type LucideIcon } from "lucide-react";

// The six guest action verbs — the shared source of truth consumed by the mobile
// ActionGrid and the desktop DesktopSectionNav (data shared, chrome diverges per
// the two-layout-systems principle). slug = the /a/:action route param.
export const ACTIONS = [
  { slug: "eat", Icon: Utensils, key: "actions.eat" },
  { slug: "drink", Icon: Wine, key: "actions.drink" },
  { slug: "see", Icon: Eye, key: "actions.see" },
  { slug: "do", Icon: Footprints, key: "actions.do" },
  { slug: "buy", Icon: ShoppingBag, key: "actions.buy" },
  { slug: "move", Icon: Car, key: "actions.move" },
] as const satisfies ReadonlyArray<{ slug: string; Icon: LucideIcon; key: string }>;
