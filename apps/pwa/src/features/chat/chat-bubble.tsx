import { useTranslation } from "react-i18next";
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
  const time = formatTime(ts, i18n.language);

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
