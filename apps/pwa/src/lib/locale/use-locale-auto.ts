import { useEffect, useRef } from "react";
import { useSessionStore } from "@/store/session";
import i18n from "@/lib/i18n";

export function useLocaleAuto() {
  const guestLocale = useSessionStore((s) => s.guest?.locale);
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    if (guestLocale && guestLocale !== i18n.language) {
      void i18n.changeLanguage(guestLocale);
      applied.current = true;
    }
  }, [guestLocale]);
}
