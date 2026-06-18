import * as React from "react";
import type { TourStop } from "@/components/timeline-stop";

// Outer wrapper that wires rail-step ⇄ map-marker hover/focus sync WITHOUT editing
// the shared DailyTourTimeline (which exposes only `stops`/`onReorder`, no per-stop
// hover callback). It listens — via event delegation — for pointerover/focusin
// inside its subtree and maps the target's position in the timeline list to a stop
// id, then lifts it to `onActivate`.
//
// The timeline renders each stop as a <li> (motion Reorder.Item default) directly
// under the Reorder.Group <ul>. We resolve the hovered <li>, read its index among
// its <li> siblings, and look it up in `stops`. Index-based (not id-based) because
// the unforked TimelineStop emits no stop id; reorder is local-only and not wired
// to the map, so the order stays aligned with `stops`.
export function StopSyncBridge({
  stops,
  onActivate,
  children,
}: {
  stops: TourStop[];
  onActivate: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  // Keep the latest stops without re-binding listeners on every render.
  const stopsRef = React.useRef(stops);
  stopsRef.current = stops;

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;

    function activateFrom(target: EventTarget | null) {
      if (!(target instanceof Element)) return;
      const li = target.closest("li");
      if (!li || !li.parentElement) return;
      const index = Array.prototype.indexOf.call(
        li.parentElement.querySelectorAll(":scope > li"),
        li,
      );
      const stop = index >= 0 ? stopsRef.current[index] : undefined;
      if (stop) onActivate(stop.id);
    }

    function handleOver(e: Event) {
      activateFrom(e.target);
    }
    function handleLeave() {
      onActivate(null);
    }

    root.addEventListener("pointerover", handleOver);
    root.addEventListener("focusin", handleOver);
    root.addEventListener("pointerleave", handleLeave);

    return () => {
      root.removeEventListener("pointerover", handleOver);
      root.removeEventListener("focusin", handleOver);
      root.removeEventListener("pointerleave", handleLeave);
    };
  }, [onActivate]);

  return <div ref={ref}>{children}</div>;
}
