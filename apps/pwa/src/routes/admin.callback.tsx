import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ownerUserManager } from "@/lib/auth/owner-oidc";
import { useOwnerSessionStore } from "@/store/owner-session";

export default function AdminCallbackRoute() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const setOwnerSession = useOwnerSessionStore((s) => s.setOwnerSession);

  useEffect(() => {
    void (async () => {
      try {
        const user = await ownerUserManager.signinCallback();
        if (user) {
          setOwnerSession(user.access_token, {
            sub: user.profile.sub,
            email: user.profile.email ?? null,
            name: user.profile.name ?? null,
          });
        }
      } catch {
        // State mismatch (e.g. hot reload) — retry from /admin
      } finally {
        void navigate("/admin", { replace: true });
      }
    })();
  }, [navigate, setOwnerSession]);

  return (
    <main className="min-h-svh grid place-items-center" aria-live="polite" aria-busy="true">
      <p className="text-muted-foreground">{t("shell.loading", "Loading admin…")}</p>
    </main>
  );
}
