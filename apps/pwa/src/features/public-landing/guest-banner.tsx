import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

// Persistent signal that this is the UNauthenticated public landing, not the
// authed home. Invite-only app: guests normally enter via /r/:token; the bare
// "/" is what someone sees without that link. Rendered above the fold so it's
// visible without scrolling. See daily-tour task #129.
export function GuestBanner() {
  const { t } = useTranslation("public");
  return (
    <div
      data-testid="guest-banner"
      className="flex flex-wrap items-center justify-center gap-2 border-b border-border bg-muted/50 px-6 py-2 text-center text-sm"
    >
      <Badge variant="secondary" className="uppercase tracking-wide">
        {t("guest_banner.badge", "Public preview")}
      </Badge>
      <span className="text-muted-foreground">
        {t("guest_banner.text", "Open your personal booking link to see your stay.")}
      </span>
    </div>
  );
}
