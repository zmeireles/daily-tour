import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Hero } from "@/features/public-landing/hero";
import { OwnerPitch } from "@/features/public-landing/owner-pitch";
import { SamplePlaces } from "@/features/public-landing/sample-places";
import { CheckAvailabilityCta } from "@/features/public-landing/check-availability-cta";
import { LocaleSwitcher } from "@/features/public-landing/locale-switcher";
import { useSessionStore } from "@/store/session";
import AuthedIndexRoute from "@/routes/_authed.index";

function PublicIndex() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const isExpired = searchParams.get("reason") === "expired";

  return (
    <div className="min-h-svh bg-background flex flex-col">
      <header className="flex justify-end px-6 py-4">
        <LocaleSwitcher />
      </header>
      <main className="flex-1">
        {isExpired && (
          <p
            className="mx-auto max-w-md mt-2 px-6 text-sm text-destructive text-center"
            data-testid="expired-message"
          >
            {t("landing.expired_message", "Your link expired. Please ask your host for a new one.")}
          </p>
        )}
        <Hero />
        <OwnerPitch />
        <SamplePlaces />
        <CheckAvailabilityCta />
      </main>
    </div>
  );
}

export default function IndexRoute() {
  const jwt = useSessionStore((s) => s.jwt);
  if (jwt) return <AuthedIndexRoute />;
  return <PublicIndex />;
}
