import { useState, useRef } from "react";
import { Reorder, useDragControls } from "motion/react";
import { TimelineStop, type TourStop } from "./timeline-stop";

export type { TourStop };

interface DailyTourTimelineProps {
  stops: TourStop[];
  onReorder?: (stops: TourStop[]) => void;
}

export function DailyTourTimeline({ stops: initialStops, onReorder }: DailyTourTimelineProps) {
  const [stops, setStops] = useState(initialStops);

  function handleReorder(next: TourStop[]) {
    setStops(next);
    onReorder?.(next);
  }

  return (
    <div className="relative pl-8">
      {/* Vertical basalt timeline line, behind the node dots. */}
      <div
        className="pointer-events-none absolute left-[1.375rem] top-2 bottom-4 w-px bg-outline-variant"
        aria-hidden="true"
      />
      <Reorder.Group
        axis="y"
        values={stops}
        onReorder={handleReorder}
        className="relative m-0 list-none p-0"
      >
        {stops.map((stop, idx) => (
          <DraggableStop key={stop.id} stop={stop} isLast={idx === stops.length - 1} />
        ))}
      </Reorder.Group>
    </div>
  );
}

function DraggableStop({ stop, isLast }: { stop: TourStop; isLast: boolean }) {
  const dragControls = useDragControls();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  const dragHandleProps: React.HTMLAttributes<HTMLDivElement> = {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.pointerType === "touch") {
        const native = e.nativeEvent;
        timerRef.current = setTimeout(() => dragControls.start(native), 500);
      } else {
        dragControls.start(e);
      }
    },
    onPointerUp: clearTimer,
    onPointerCancel: clearTimer,
    style: { touchAction: "none", cursor: "grab" },
    "aria-label": "Drag to reorder",
  };

  return (
    <Reorder.Item value={stop} dragListener={false} dragControls={dragControls}>
      <TimelineStop stop={stop} isLast={isLast} dragHandleProps={dragHandleProps} />
    </Reorder.Item>
  );
}
