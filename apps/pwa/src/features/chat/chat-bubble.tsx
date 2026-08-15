import { useTranslation } from "react-i18next";
import { formattingLocale } from "@/lib/i18n/formatting-locale";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  body: string;
  from: "me" | "them";
  ts: number;
}

function formatTime(ts: number, locale: string): string {
  return new Date(ts).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function ChatBubble({ body, from, ts }: ChatBubbleProps) {
  const { i18n } = useTranslation("discover");
  const isMe = from === "me";
  // `i18n.language` is the translation bundle, not the user's time
  // conventions: it collapses en-GB to en, which renders "02:30 PM" to a
  // British guest instead of "14:30". Same split as the owner surfaces.
  const time = formatTime(ts, formattingLocale(i18n.language));

  return (
    <div className={cn("flex flex-col gap-1", isMe ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words",
          // Editorial surfaces: guest (me) = tea-green, host (them) = cream paper.
          isMe
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-surface-container-low text-on-surface",
        )}
        data-testid={`chat-bubble-${from}`}
      >
        {body}
      </div>
      <time className="px-1 text-xs text-on-surface-variant" data-testid={`chat-time-${from}`}>
        {time}
      </time>
    </div>
  );
}
