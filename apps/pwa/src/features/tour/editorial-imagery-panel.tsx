import { useTranslation } from "react-i18next";
import { Overline } from "@/components/overline";

// The brand-imagery half of the desktop intake planner: a full-height São Miguel
// photo with a bottom cream→ink scrim carrying an Overline kicker, a Fraunces
// value-prop, and the Miguel host line. When no image is available it degrades to
// a branded tea-green field (mirrors PlaceCard's HeroPlaceholder approach) so the
// panel still reads as intentional. Reusable for the Chat empty-state later.
//
// At the md/834 band the consumer stacks this ABOVE the form as a short banner —
// the `banner` prop only trims the min-height; the editorial content is unchanged.
export function EditorialImageryPanel({
  imageUrl,
  banner = false,
}: {
  imageUrl?: string | null;
  banner?: boolean;
}) {
  const { t } = useTranslation("home");
  const heightClass = banner ? "min-h-[220px]" : "h-full min-h-[480px]";

  return (
    <div
      className={`relative isolate overflow-hidden rounded-2xl ${heightClass}`}
      data-testid="editorial-imagery-panel"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <div className="absolute inset-0 bg-primary/15" aria-hidden="true" />
      )}

      {/* Bottom cream→ink scrim anchoring the editorial text. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[var(--basalt-950)]/80 via-[var(--basalt-950)]/20 to-transparent"
        aria-hidden="true"
      />

      <div className="relative flex h-full flex-col justify-end gap-stack p-8">
        <Overline size="sm" className="text-[var(--cream-50)]/90">
          {t("tour.intake.imagery_kicker")}
        </Overline>
        <p className="max-w-[18ch] font-display text-3xl leading-tight text-[var(--cream-50)]">
          {t("tour.intake.imagery_headline")}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            M
          </span>
          <span className="text-sm text-[var(--cream-50)]/90">{t("tour.intake.imagery_host")}</span>
        </div>
      </div>
    </div>
  );
}
