import { useTranslation } from "react-i18next";
import { PlaceCard } from "@/components/place-card";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_PLACES } from "@/lib/sample-places";

export function SamplePlaces() {
  const { t } = useTranslation("public");
  return (
    <section className="py-10 px-6">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <h2
          className="text-2xl font-semibold text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("sample_places.title", "A taste of São Miguel")}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {t(
            "sample_places.caption",
            "A preview of the island — open your booking link to explore your host's full guide.",
          )}
        </p>
      </div>
      {/* Static preview, not a list of tappable cards. pointer-events-none kills
          the hover/tap affordance (no ghost click — guests have no JWT, so
          /p/:id would bounce them); the per-card "Sample" tag makes the intent
          explicit. place-card.tsx is intentionally left untouched. See #130. */}
      <div
        data-testid="sample-places-grid"
        className="pointer-events-none grid select-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {SAMPLE_PLACES.map((place) => (
          <div key={place.id} className="relative">
            <Badge
              variant="secondary"
              className="absolute right-2 top-2 z-10 uppercase tracking-wide"
            >
              {t("sample_places.tag", "Sample")}
            </Badge>
            <PlaceCard {...place} />
          </div>
        ))}
      </div>
    </section>
  );
}
