import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { refreshSession, decodeJwt } from "@/lib/auth/refresh";

interface Props {
  children: ReactNode;
}

// Bridges the gap between F5 and a re-mounted React tree: on first paint,
// if the in-memory session store is empty AND we're not already on a
// /r/:token route (which has its own exchange), ask the BFF to re-mint a
// JWT from the HttpOnly dt_refresh cookie.
//
// While the refresh round-trip is in flight, render a minimal loading
// state — this is what stops the flash of public landing on refresh that
// UAT-G02 caught.
export function SessionBootstrap({ children }: Props) {
  const setSession = useSessionStore((s) => s.setSession);
  const jwt = useSessionStore((s) => s.jwt);
  const [booting, setBooting] = useState(() => {
    // Skip bootstrap entirely if we already have a session (HMR remount
    // during dev) OR if we're on /r/:token (that route does its own exchange).
    if (jwt) return false;
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/r/")) {
      return false;
    }
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
      return false;
    }
    return true;
  });
  const ran = useRef(false);
  const { t } = useTranslation("common");

  useEffect(() => {
    if (!booting || ran.current) return;
    ran.current = true;

    void (async () => {
      const result = await refreshSession();
      if (result) {
        const claims = decodeJwt(result.jwt) as {
          sub: string;
          rid: string;
          gh: string;
          locale: string;
          exp: number;
        };
        setSession(result.jwt, claims);
      }
      setBooting(false);
    })();
  }, [booting, setSession]);

  if (booting) {
    return (
      <main
        className="min-h-svh grid place-items-center"
        aria-live="polite"
        aria-busy="true"
        data-testid="session-bootstrap-loading"
      >
        <p className="text-muted-foreground">{t("auth.bootstrapping")}</p>
      </main>
    );
  }

  return <>{children}</>;
}
