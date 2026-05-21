import { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useSessionStore } from "@/store/session";
import {
  decodeJwt,
  exchangeOpaqueToken,
  TokenExpiredError,
  TokenInvalidError,
} from "@/lib/auth/exchange";

export default function RTokenRoute() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const { t } = useTranslation("common");

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const { jwt } = await exchangeOpaqueToken(token);
        const claims = decodeJwt(jwt);
        setSession(jwt, claims);
        // Apply the JWT's locale exactly once per fresh /r/:token entry.
        // LanguageDetector then caches this in localStorage and wins on
        // every subsequent load — preserving the user's explicit choice
        // if they later toggle the locale switcher. Doing this here
        // (rather than in a per-route useEffect) avoids the race against
        // LanguageDetector that caused DT-TESTS-10 to fail.
        if (claims.locale && claims.locale !== i18n.language) {
          await i18n.changeLanguage(claims.locale);
        }
        void navigate("/", { replace: true });
      } catch (err) {
        if (err instanceof TokenExpiredError || err instanceof TokenInvalidError) {
          toast.error(
            t("auth.token_expired", "Your link has expired. Ask your host for a new one."),
          );
        } else {
          toast.error(t("auth.exchange_failed", "Something went wrong. Try again."));
        }
        void navigate("/?reason=expired", { replace: true });
      }
    })();
  }, [token, navigate, setSession, t]);

  return (
    <main className="min-h-svh grid place-items-center" aria-live="polite" aria-busy="true">
      <p className="text-muted-foreground">{t("auth.exchanging", "Logging you in…")}</p>
    </main>
  );
}
