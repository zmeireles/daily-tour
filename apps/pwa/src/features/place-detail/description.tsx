import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface DescriptionProps {
  text: string;
  fallback: boolean;
  translationPendingLabel: string;
}

export function Description({ text, fallback, translationPendingLabel }: DescriptionProps) {
  return (
    <div className="px-4 py-3 space-y-2">
      {fallback && (
        <Badge variant="outline" className="text-xs">
          {translationPendingLabel}
        </Badge>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}
