import * as React from "react";
import { useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import type { I18nText, Locale } from "@daily-tour/shared-types";
import { useSessionStore } from "@/store/session";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { usePlaceDetail, type PlaceWish } from "@/features/place-detail/use-place-detail";
import { Hero } from "@/features/place-detail/hero";
import { Gallery } from "@/features/place-detail/gallery";
import { Description } from "@/features/place-detail/description";
import { PlaceMap } from "@/features/place-detail/place-map";
import { ActionRow } from "@/features/place-detail/action-row";
import { DetailsCard } from "@/features/place-detail/details-card";
import { Overline } from "@/components/overline";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { BackLink } from "@/components/back-link";
import { ResponsiveScreen } from "@/components/responsive-screen";
import { PlaceDetailDesktop } from "@/features/place-detail/place-detail-desktop";
import { appleMapsHref, telHref, waMeHref } from "@/lib/maps/deep-links";
import { GUESTHOUSE_CONTACT_PHONE } from "@/lib/config";

function localeWithFallback(value: I18nText, locale: string) {
  if (value[locale as Locale]) return { text: value[locale as Locale] ?? "", fallback: false };
  if (value.en) return { text: value.en, fallback: true };
  return { text: Object.values(value)[0] ?? "", fallback: true };
}

// A wish's localized label (e.g. "Hiking"), with graceful fallback to the slug
// when no translation is present.
function wishLabel(wish: PlaceWish, locale: string): string {
  const fromI18n = localeWithFallback(wish.label_i18n, locale).text;
  return fromI18n || wish.slug;
}

export default function PlaceDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t, i18n } = useTranslation("place");
  // Apply the sunrise/sunset (or stored-override) theme on this route. The
  // router is flat — there's no shared authed layout mounting useThemeAuto —
  // so each authed screen opts in. Without this, landing directly on /p/:id
  // renders the :root light fallback regardless of theme (see T-2.D follow-up
  // for the shared-layout fix that also covers chat/tour).
  useThemeAuto();

  useEffect(() => {
    if (!jwt) {
      void navigate("/?reason=expired", { replace: true });
    }
  }, [jwt, navigate]);

  const handleBack = useCallback(() => {
    void navigate(-1);
  }, [navigate]);

  const { data: place, isLoading, isError, error } = usePlaceDetail(id ?? "", jwt ?? "");

  if (!jwt) return null;

  if (isLoading) {
    return (
      <main className="min-h-svh grid place-items-center" aria-live="polite" aria-busy="true">
        <p className="text-muted-foreground">{t("loading")}</p>
      </main>
    );
  }

  const err = error as Error & { status?: number };
  if (isError && err?.status === 404) {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">{t("not_found")}</p>
        <BackLink to="/">{t("actions.navigate", "Back")}</BackLink>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">{t("error")}</p>
        <BackLink to="/">Home</BackLink>
      </main>
    );
  }

  if (!place) return null;

  const locale = i18n.language;
  const nameResult = localeWithFallback(place.name, locale);
  const descResult = localeWithFallback(place.description, locale);

  const firstImage = [...place.media]
    .filter((m) => m.kind === "image")
    .sort((a, b) => a.sort_order - b.sort_order)[0];
  const firstImageUrl = firstImage?.url ?? "";

  const phone = place.contacts.phone ?? GUESTHOUSE_CONTACT_PHONE;
  const waText = t("wa_prefill", {
    placeName: nameResult.text,
    defaultValue: `Hi! I'm at ${nameResult.text}, can you recommend the next stop?`,
  });

  // Overline = the primary (first) wish label, uppercased; category chips =
  // every wish. With no distance field in the payload, the overline is the
  // category only (no "· 14 KM"). Both degrade to nothing when wishes is empty.
  const primaryWish = place.wishes[0];
  const overlineLabel = primaryWish ? wishLabel(primaryWish, locale) : null;

  // Deep links, resolved once and shared by both layouts.
  const navigateHref = appleMapsHref(place.geom_lat, place.geom_lng);
  const callHref = telHref(phone);
  const waHref = waMeHref(phone, waText);

  const mobile = (
    <>
      {/* pb-28 (not pb-24) so the bottom PlaceMap clears the fixed BottomTabBar +
          its safe-area inset at tablet width (placedetail-map-tabbar-overlap). */}
      <main className="min-h-svh w-full bg-surface pb-28">
        <Hero
          imageUrl={firstImageUrl}
          title={nameResult.text}
          attribution={firstImage?.attribution}
          onBack={handleBack}
          backLabel={t("actions.back")}
          saveLabel={t("save_coming_soon")}
        />

        <div className="mx-auto w-full max-w-2xl space-y-8 px-4 pt-6">
          {/* Header group: overline → name → category chips */}
          <header className="space-y-3">
            {overlineLabel && <Overline className="block text-primary">{overlineLabel}</Overline>}
            <h1 className="font-display text-3xl leading-tight text-on-surface">
              {nameResult.text}
            </h1>
            {nameResult.fallback && (
              <span
                className="inline-block rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
                aria-label="name in English (translation pending)"
              >
                {t("translation_pending")}
              </span>
            )}
            {place.wishes.length > 0 && (
              <ul className="flex flex-wrap gap-2 pt-1">
                {place.wishes.map((wish) => (
                  <li
                    key={wish.slug}
                    className="rounded-full border border-tertiary-container/30 bg-tertiary-container/20 px-3 py-1 text-sm text-on-tertiary-container"
                  >
                    {wishLabel(wish, locale)}
                  </li>
                ))}
              </ul>
            )}
          </header>

          <Description
            text={descResult.text}
            fallback={descResult.fallback}
            translationPendingLabel={t("translation_pending")}
          />

          <Gallery media={place.media} altFallback={nameResult.text} />

          <ActionRow
            navigateHref={appleMapsHref(place.geom_lat, place.geom_lng)}
            callHref={telHref(phone)}
            waHref={waMeHref(phone, waText)}
            navigateLabel={t("actions.navigate")}
            callLabel={t("actions.call")}
            messageLabel={t("actions.message")}
          />

          <DetailsCard
            season={place.season}
            hours={place.hours}
            title={t("details.title")}
            openingHoursLabel={t("details.opening_hours")}
            bestSeasonLabel={t("details.best_season")}
          />

          <PlaceMap lat={place.geom_lat} lng={place.geom_lng} />
        </div>
      </main>
      <BottomTabBar active="explore" />
    </>
  );

  return (
    <ResponsiveScreen
      engageAt="lg"
      mobile={mobile}
      desktop={
        <PlaceDetailDesktop
          place={place}
          name={nameResult.text}
          nameFallback={nameResult.fallback}
          description={descResult.text}
          descriptionFallback={descResult.fallback}
          overlineLabel={overlineLabel}
          wishLabels={place.wishes.map((wish) => wishLabel(wish, locale))}
          heroImageUrl={firstImageUrl}
          heroAttribution={firstImage?.attribution ?? null}
          navigateHref={navigateHref}
          callHref={callHref}
          waHref={waHref}
        />
      }
    />
  );
}
