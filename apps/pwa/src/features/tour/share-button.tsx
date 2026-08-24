import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/session";
import { useSetPlanShared } from "@/features/tour/use-tour-plan";

interface ShareButtonProps {
  planId: string;
  // Whether the plan is currently shared. Drives the revoke affordance; when
  // undefined (an older cached plan without the field) the button behaves as
  // it always did and simply shares.
  sharedAt?: string | null;
  // When set, renders the editorial tea-green call-to-action (icon + label)
  // instead of the default compact outline button.
  editorial?: boolean;
  className?: string;
}

export function ShareButton({ planId, sharedAt, editorial = false, className }: ShareButtonProps) {
  const { t } = useTranslation("discover");
  const [copied, setCopied] = useState(false);
  const jwt = useSessionStore((s) => s.jwt);
  const setShared = useSetPlanShared(planId);

  const shareUrl = `${window.location.origin}/tour/share/${planId}`;

  async function handleShare() {
    // dt-tests #40 — the grant happens HERE, and it must land before the link
    // leaves the device. Previously this button only built a URL: every ready
    // plan was already public, so "sharing" granted nothing. Now a plan is
    // private until this call succeeds, and handing out a link to a plan the
    // server still considers private would produce a 404 for the recipient.
    if (jwt) {
      try {
        await setShared.mutateAsync({ jwt, shared: true });
      } catch {
        // Could not grant access — do NOT hand out a link that will 404.
        return;
      }
    }

    if (navigator.share) {
      // Deliberate: the plan stays shared even if the guest dismisses the OS
      // sheet. The Web Share API does not report whether anything was actually
      // sent, so "revoke on cancel" is not implementable — and silently
      // un-sharing after a real send would break the link. Revoke is explicit.
      try {
        await navigator.share({ url: shareUrl, title: t("tour.share.title") });
      } catch {
        // User cancelled — ignore AbortError
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — silently fail
    }
  }

  function handleRevoke() {
    if (!jwt) return;
    setShared.mutate({ jwt, shared: false });
  }

  const isShared = !!sharedAt;
  const busy = setShared.isPending;

  // Once shared, the guest needs a way back out — that is the half of the card
  // a guest actually asks for the day a link escapes.
  const revokeButton = isShared ? (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRevoke}
      disabled={busy}
      aria-label={t("tour.share.revoke_aria", "Stop sharing this plan")}
    >
      {t("tour.share.revoke", "Stop sharing")}
    </Button>
  ) : null;

  if (editorial) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button
          onClick={() => void handleShare()}
          disabled={busy}
          aria-label={t("tour.share.button")}
          className="gap-2 rounded-full bg-primary px-6 hover:bg-primary/90"
        >
          <Share2 className="size-4" aria-hidden="true" />
          {copied ? t("tour.share.copied") : t("tour.share.button")}
        </Button>
        {revokeButton}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleShare()}
        disabled={busy}
        aria-label={t("tour.share.button")}
      >
        {copied ? t("tour.share.copied") : t("tour.share.button")}
      </Button>
      {revokeButton}
    </div>
  );
}
