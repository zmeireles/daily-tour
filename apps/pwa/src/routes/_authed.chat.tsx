import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { ChatWindow } from "@/features/chat/chat-window";
import { useChatWs } from "@/features/chat/use-chat-ws";

export default function ChatRoute() {
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  const { t } = useTranslation("discover");
  const { messages, status, send } = useChatWs(jwt);

  useEffect(() => {
    if (!jwt) void navigate("/?reason=expired", { replace: true });
  }, [jwt, navigate]);

  if (!jwt) return null;

  return (
    <main className="flex flex-col h-svh max-w-lg mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("chat.back")}
        >
          ←
        </button>
        <h1
          className="font-display text-lg font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("chat.title")}
        </h1>
      </header>
      <ChatWindow messages={messages} status={status} onSend={send} />
    </main>
  );
}
