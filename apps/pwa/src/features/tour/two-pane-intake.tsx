import { IntakeForm, type IntakeFormData } from "@/features/tour/intake-form";
import { EditorialImageryPanel } from "@/features/tour/editorial-imagery-panel";

// A São Miguel photo seeded for the intake planner's imagery half. Swappable per
// guesthouse later; for now a stable editorial still from the seeded media set.
const INTAKE_IMAGERY_URL = "/media/the-view-point/01.jpg";

// Desktop intake planner body: a [form | imagery] two-pane grid. LEFT is a raised
// card wrapping the UNFORKED IntakeForm verbatim; RIGHT is the EditorialImageryPanel.
// At md/834 the grid collapses to one column and the imagery panel stacks ABOVE the
// form as a short banner.
export function TwoPaneIntake({
  onSubmit,
  submitting,
}: {
  onSubmit: (data: IntakeFormData) => void | Promise<void>;
  submitting?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-8">
      {/* Imagery banner first in source order so it leads on the stacked md band. */}
      <div className="lg:order-2">
        {/* Full-height panel on the two-pane band; short banner when stacked. */}
        <div className="hidden h-full lg:block">
          <EditorialImageryPanel imageUrl={INTAKE_IMAGERY_URL} />
        </div>
        <div className="lg:hidden">
          <EditorialImageryPanel imageUrl={INTAKE_IMAGERY_URL} banner />
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-8 lg:order-1">
        <IntakeForm onSubmit={onSubmit} submitting={submitting} />
      </div>
    </div>
  );
}
