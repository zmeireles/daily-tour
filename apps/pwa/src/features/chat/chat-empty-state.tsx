import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SuggestedPromptChips } from "./suggested-prompts";

const HOST_NAME = "Miguel";

// Centrepiece of the desktop empty conversation: an editorial hero — Miguel's
// avatar with a presence ring, a Fraunces display welcome, a subtitle, and the
// suggested-prompt chips. Shown only while status==="open" && messages.length===0.
export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
  const { t } = useTranslation("discover");

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-6 px-8 py-12 text-center"
      data-testid="chat-empty-state"
    >
      <span className="rounded-full p-1 ring-2 ring-primary/40">
        <Avatar className="size-20">
          <AvatarFallback className="bg-primary text-2xl font-medium text-primary-foreground">
            {HOST_NAME.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-display-lg leading-[0.98] text-on-surface">
          {t("chat.welcome_title")}
        </h2>
        <p className="text-base text-on-surface-variant">{t("chat.welcome_subtitle")}</p>
      </div>
      <SuggestedPromptChips onPick={onPick} />
    </div>
  );
}
