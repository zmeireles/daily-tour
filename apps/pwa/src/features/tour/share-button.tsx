import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  planId: string;
}

export function ShareButton({ planId }: ShareButtonProps) {
  const { t } = useTranslation("discover");
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/tour/share/${planId}`;

  async function handleShare() {
    if (navigator.share) {
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

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void handleShare()}
      aria-label={t("tour.share.button")}
    >
      {copied ? t("tour.share.copied") : t("tour.share.button")}
    </Button>
  );
}
