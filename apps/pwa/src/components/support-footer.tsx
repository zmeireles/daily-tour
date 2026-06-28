import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type SupportFooterProps = {
  className?: string;
};

// Quiet guest footer: a help path to the host chat plus legal links. Plain <a>
// anchors (not react-router <Link>) so it stays safe outside router context.
export function SupportFooter({ className }: SupportFooterProps) {
  const { t } = useTranslation("home");

  return (
    <footer
      className={cn(
        "mt-auto border-t border-outline-variant px-4 py-6 text-center text-xs text-on-surface-variant",
        className,
      )}
    >
      <a href="/chat" className="font-medium text-primary hover:underline">
        {t("support.need_help", "Need help? Message your host")}
      </a>
      <div className="mt-2 flex items-center justify-center gap-2">
        <a href="/privacy" className="hover:text-on-surface hover:underline">
          {t("support.privacy", "Privacy")}
        </a>
        <span aria-hidden="true">·</span>
        <a href="/terms" className="hover:text-on-surface hover:underline">
          {t("support.terms", "Terms")}
        </a>
      </div>
    </footer>
  );
}
