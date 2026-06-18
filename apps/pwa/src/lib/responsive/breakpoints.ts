// Single source of truth for the desktop fork breakpoints, shared by JS
// (useLayoutMode's matchMedia query) and read alongside Tailwind's CSS `md`/`lg`
// variants. These MUST stay equal to Tailwind v4's defaults (md=768, lg=1024)
// so CSS and JS agree on the fork width.
//
// FLOOR (lg/1024): the hard floor below which NO desktop component may render —
//   phones are guaranteed the byte-identical shipped mobile tree.
// EARLY (md/768): per-screen opt-in early-engage, used ONLY by the screens that
//   are already broken at tablet width today (Home, Daily Tour).
export const DESKTOP_FLOOR = 1024;
export const DESKTOP_EARLY = 768;

export type LayoutEngageAt = "md" | "lg";

export const ENGAGE_WIDTH: Record<LayoutEngageAt, number> = {
  md: DESKTOP_EARLY,
  lg: DESKTOP_FLOOR,
};
