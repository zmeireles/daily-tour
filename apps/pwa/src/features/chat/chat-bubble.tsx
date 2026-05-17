import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  body: string;
  from: "me" | "them";
}

export function ChatBubble({ body, from }: ChatBubbleProps) {
  const isMe = from === "me";
  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isMe
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {body}
      </div>
    </div>
  );
}
