import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

function ErrorState({ title, description, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation("admin");
  const resolvedTitle = title ?? t("error_state.title", "Couldn't load");
  const resolvedDescription =
    description ?? t("error_state.description", "An unexpected error occurred. Please try again.");
  return (
    <div
      data-slot="error-state"
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-8 text-center",
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <AlertTriangleIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{resolvedTitle}</p>
        <p className="text-sm text-muted-foreground">{resolvedDescription}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("error_state.retry", "Try again")}
        </Button>
      )}
    </div>
  );
}

export { ErrorState };
