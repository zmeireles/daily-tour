import * as React from "react";
import { Badge } from "@/components/ui/badge";

interface DescriptionProps {
  text: string;
  fallback: boolean;
  translationPendingLabel: string;
}

export function Description({ text, fallback, translationPendingLabel }: DescriptionProps) {
  return (
    <div className="space-y-2">
      {fallback && (
        <Badge variant="outline" className="text-xs">
          {translationPendingLabel}
        </Badge>
      )}
      <p className="max-w-[65ch] text-base leading-relaxed text-on-surface-variant">{text}</p>
    </div>
  );
}
