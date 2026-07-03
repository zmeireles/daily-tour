import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ownerUserManager } from "@/lib/auth/owner-oidc";
import { useOwnerSessionStore } from "@/store/owner-session";
import { BackofficeShell } from "@/features/backoffice/shell";

export default function AdminRoute() {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const setOwnerSession = useOwnerSessionStore((s) => s.setOwnerSession);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const user = await ownerUserManager.getUser();
        if (!user || user.expired) {
          await ownerUserManager.signinRedirect();
          return;
        }
        setOwnerSession(user.access_token, {
          sub: user.profile.sub,
          email: user.profile.email ?? null,
          name: user.profile.name ?? null,
        });
        setChecking(false);
      } catch {
        await ownerUserManager.signinRedirect();
      }
    })();
  }, [navigate, setOwnerSession]);

  if (checking) {
    return (
      <main
        data-app="admin"
        className="min-h-svh grid place-items-center"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-muted-foreground">{t("shell.redirecting", "Redirecting to login…")}</p>
      </main>
    );
  }

  return (
    <div data-app="admin" className="contents">
      <BackofficeShell />
    </div>
  );
}
