import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

// Single source for the suggested-prompt strings, presented two ways:
//  - SuggestedPromptChips: a wrap of pill buttons in the editorial empty state.
//  - SuggestionStrip: the same pills as a thin horizontal scroll-x row pinned
//    above the composer once the thread has messages.
// One i18n key set (discover:chat.prompts.*), one click contract (seed + send).
const PROMPT_KEYS = ["visit", "eat", "calheta", "taxi"] as const;

// Pill tokens shared with DistanceChip (hydrangea tertiary container), rendered
// as a button so the prompt is keyboard-activatable and seeds the draft + sends.
const PILL =
  "inline-flex shrink-0 cursor-pointer items-center rounded-full bg-tertiary-container px-3 py-1.5 " +
  "text-sm font-medium text-on-tertiary-container transition-colors hover:bg-tertiary-container/70 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function usePrompts(): { key: string; label: string }[] {
  const { t } = useTranslation("discover");
  return PROMPT_KEYS.map((key) => ({ key, label: t(`chat.prompts.${key}`) }));
}

// Empty-state presentation: a centered wrap of prompt pills.
export function SuggestedPromptChips({ onPick }: { onPick: (text: string) => void }) {
  const prompts = usePrompts();
  return (
    <div className="flex flex-wrap justify-center gap-2" data-testid="chat-prompt-chips">
      {prompts.map(({ key, label }) => (
        <button key={key} type="button" className={PILL} onClick={() => onPick(label)}>
          {label}
        </button>
      ))}
    </div>
  );
}

// Active-state presentation: the same pills as a thin horizontal scroll-x strip.
export function SuggestionStrip({
  onPick,
  className,
}: {
  onPick: (text: string) => void;
  className?: string;
}) {
  const prompts = usePrompts();
  return (
    <div
      className={cn("flex gap-2 overflow-x-auto", className)}
      data-testid="chat-suggestion-strip"
    >
      {prompts.map(({ key, label }) => (
        <button key={key} type="button" className={PILL} onClick={() => onPick(label)}>
          {label}
        </button>
      ))}
    </div>
  );
}
