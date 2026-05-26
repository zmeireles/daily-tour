import * as React from "react";
import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { I18nText, Locale } from "@daily-tour/shared-types";
import { useSessionStore } from "@/store/session";
import { usePlaceDetail } from "@/features/place-detail/use-place-detail";
import { Hero } from "@/features/place-detail/hero";
import { Gallery } from "@/features/place-detail/gallery";
import { Description } from "@/features/place-detail/description";
import { PlaceMap } from "@/features/place-detail/place-map";
import { ActionRow } from "@/features/place-detail/action-row";
import { appleMapsHref, telHref, waMeHref } from "@/lib/maps/deep-links";
import { GUESTHOUSE_CONTACT_PHONE } from "@/lib/config";

function localeWithFallback(value: I18nText, locale: string) {
  if (value[locale as Locale]) return { text: value[locale as Locale] ?? "", fallback: false };
  if (value.en) return { text: value.en, fallback: true };
  return { text: Object.values(value)[0] ?? "", fallback: true };
}

export default function PlaceDetailRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t, i18n } = useTranslation("place");

  useEffect(() => {
    if (!jwt) {
      void navigate("/?reason=expired", { replace: true });
    }
  }, [jwt, navigate]);

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
        <Link to="/" className="text-primary underline underline-offset-4 text-sm">
          ← {t("actions.navigate", "Back")}
        </Link>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-svh flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">{t("error")}</p>
        <Link to="/" className="text-primary underline underline-offset-4 text-sm">
          ← Home
        </Link>
      </main>
    );
  }

  if (!place) return null;

  const locale = i18n.language;
  const nameResult = localeWithFallback(place.name, locale);
  const descResult = localeWithFallback(place.description, locale);

  const firstImageUrl =
    [...place.media]
      .filter((m) => m.kind === "image")
      .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? "";

  const phone = place.contacts.phone ?? GUESTHOUSE_CONTACT_PHONE;
  const waText = t("wa_prefill", {
    placeName: nameResult.text,
    defaultValue: `Hi! I'm at ${nameResult.text}, can you recommend the next stop?`,
  });

  return (
    <main className="min-h-svh pb-8 mx-auto w-full max-w-2xl">
      <Hero imageUrl={firstImageUrl} title={nameResult.text} />
      {nameResult.fallback && (
        <div className="px-4 pt-2">
          <span
            className="inline-block rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
            aria-label="name in English (translation pending)"
          >
            {t("translation_pending")}
          </span>
        </div>
      )}
      <Gallery media={place.media} altFallback={nameResult.text} />
      <Description
        text={descResult.text}
        fallback={descResult.fallback}
        translationPendingLabel={t("translation_pending")}
      />
      <PlaceMap lat={place.geom_lat} lng={place.geom_lng} />
      <ActionRow
        navigateHref={appleMapsHref(place.geom_lat, place.geom_lng)}
        callHref={telHref(phone)}
        waHref={waMeHref(phone, waText)}
        navigateLabel={t("actions.navigate")}
        callLabel={t("actions.call")}
        messageLabel={t("actions.message")}
      />
    </main>
  );
}
