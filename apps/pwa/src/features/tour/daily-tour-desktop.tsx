import * as React from "react";
import { useTranslation } from "react-i18next";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Overline } from "@/components/overline";
import { TwoPaneIntake } from "@/features/tour/two-pane-intake";
import { TourItineraryRail } from "@/features/tour/tour-itinerary-rail";
import { TourRouteMap } from "@/features/tour/tour-route-map";
import type { IntakeFormData } from "@/features/tour/intake-form";
import type { TourStop } from "@/components/timeline-stop";

type IntakeProps = {
  stage: "intake";
  onSubmit: (data: IntakeFormData) => void | Promise<void>;
  submitting?: boolean;
  errorMessage?: string | null;
};

type TimelineProps = {
  stage: "timeline";
  planId: string;
  // dt-tests #40 — passed to the rail's ShareButton for the revoke affordance.
  sharedAt?: string | null;
  stops: TourStop[];
  subline: string;
  weatherAware: boolean;
};

export type DailyTourDesktopProps = IntakeProps | TimelineProps;

// Desktop Daily Tour — one component, two stages keyed off the route. Stage 1
// INTAKE is the contained two-pane planner; Stage 2 TIMELINE switches to the rail
// frame (itinerary rail LEFT, edge-to-edge route map RIGHT). The shared activeStopId
// is lifted here so rail step N ⇄ map marker N stay in sync.
export function DailyTourDesktop(props: DailyTourDesktopProps) {
  const { t } = useTranslation("home");
  const [activeStopId, setActiveStopId] = React.useState<string | null>(null);

  if (props.stage === "intake") {
    return (
      <DesktopAppShell frame="contained">
        <header className="flex flex-col gap-stack pb-section">
          <Overline>{t("tour.editorial.overline")}</Overline>
          <h1 className="font-display text-display-lg leading-[0.98] text-on-surface">
            {t("tour.new.title")}
          </h1>
          {props.errorMessage && (
            <p className="text-sm text-destructive" role="alert">
              {props.errorMessage}
            </p>
          )}
        </header>
        <TwoPaneIntake onSubmit={props.onSubmit} submitting={props.submitting} />
      </DesktopAppShell>
    );
  }

  return (
    <DesktopAppShell
      frame="rail"
      railSide="left"
      railWidth="300px"
      rail={
        <TourItineraryRail
          planId={props.planId}
          sharedAt={props.sharedAt}
          stops={props.stops}
          subline={props.subline}
          weatherAware={props.weatherAware}
          activeStopId={activeStopId}
          onActivate={setActiveStopId}
        />
      }
    >
      <div className="h-[calc(100svh-5rem)]">
        <TourRouteMap
          stops={props.stops}
          activeStopId={activeStopId}
          onActivate={setActiveStopId}
        />
      </div>
    </DesktopAppShell>
  );
}
