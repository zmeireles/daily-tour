import { useTranslation } from "react-i18next";
import { PlaceCard } from "@/components/place-card";
import { SAMPLE_PLACES } from "@/lib/sample-places";

export function SamplePlaces() {
  const { t } = useTranslation("public");
  return (
    <section className="py-10 px-6 max-w-2xl mx-auto">
      <h2
        className="text-2xl font-semibold text-foreground mb-6 text-center"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("sample_places.title", "A taste of São Miguel")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SAMPLE_PLACES.map((place) => (
          <PlaceCard key={place.id} {...place} />
        ))}
      </div>
    </section>
  );
}
