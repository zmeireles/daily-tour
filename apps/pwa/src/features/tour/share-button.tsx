import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  planId: string;
  // When set, renders the editorial tea-green call-to-action (icon + label)
  // instead of the default compact outline button.
  editorial?: boolean;
  className?: string;
}

export function ShareButton({ planId, editorial = false, className }: ShareButtonProps) {
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

  if (editorial) {
    return (
      <Button
        onClick={() => void handleShare()}
        aria-label={t("tour.share.button")}
        className={cn("gap-2 rounded-full bg-primary px-6 hover:bg-primary/90", className)}
      >
        <Share2 className="size-4" aria-hidden="true" />
        {copied ? t("tour.share.copied") : t("tour.share.button")}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void handleShare()}
      aria-label={t("tour.share.button")}
      className={className}
    >
      {copied ? t("tour.share.copied") : t("tour.share.button")}
    </Button>
  );
}
