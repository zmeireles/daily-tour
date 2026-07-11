import * as React from "react";
import { useLocation, useOutlet } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

// A single keyed pane whose content is FROZEN at mount. AnimatePresence retains
// the exiting pane for the duration of its exit animation; freezing stops that
// retained element from re-rendering with the NEXT route's content (react-router
// context pierces AnimatePresence), which would otherwise make the incoming page
// play the outgoing page's exit — a flicker, and a double-mount of every route.
function FrozenPane({ content, reduce }: { content: React.ReactNode; reduce: boolean | null }) {
  const [frozen] = React.useState(content);
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.18, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {frozen}
    </motion.div>
  );
}

// Calm route-content transition for the backoffice: a short opacity fade on each
// navigation — confirms the surface changed without decorating. Opacity-only (no
// translate) so the animating wrapper never becomes the containing block for the
// fixed FAB. Instant under prefers-reduced-motion. Renders the routed outlet,
// frozen per pathname; `children` overrides it for tests that mount the shell
// directly (no router navigation).
export function PageTransition({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <FrozenPane key={pathname} content={children ?? outlet} reduce={reduce} />
    </AnimatePresence>
  );
}
