import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react";
import { useSessionStore } from "@/store/session";
import { useThemeAuto } from "@/lib/theme/use-theme-auto";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatWindow } from "@/features/chat/chat-window";
import { useChatWs } from "@/features/chat/use-chat-ws";
import { ResponsiveScreen } from "@/components/responsive-screen";
import { ChatDesktop } from "@/features/chat/chat-desktop";

// The host of every Daily Tour guesthouse thread is Miguel. The guesthouse
// name (e.g. "· Casa do Sol") isn't carried in the session — only its id — so
// the app bar shows the host name and a cosmetic presence line.
const HOST_NAME = "Miguel";

// Mobile Chat — the shipped phone tree, kept byte-identical (chat.test.tsx
// snapshot-guards it). The WS hook lives here, not on the route, so it mounts
// only when the mobile branch is rendered (the desktop sibling owns its own).
function ChatMobile({ jwt }: { jwt: string }) {
  const navigate = useNavigate();
  const { t } = useTranslation("discover");
  const { messages, status, send } = useChatWs(jwt);

  return (
    <main className="flex flex-col h-svh max-w-lg mx-auto bg-surface">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant shrink-0 bg-surface">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="-ml-1 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label={t("chat.back")}
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <Avatar className="size-10">
          <AvatarFallback>{HOST_NAME.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1
            className="font-display text-lg font-semibold leading-tight text-on-surface"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {HOST_NAME}
          </h1>
          <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
            <span className="inline-block size-2 rounded-full bg-green-500" aria-hidden="true" />
            {/* Cosmetic: no presence system is wired — status is static. */}
            {t("chat.status_online")}
          </p>
        </div>
      </header>
      <ChatWindow messages={messages} status={status} onSend={send} />
    </main>
  );
}

export default function ChatRoute() {
  const navigate = useNavigate();
  const jwt = useSessionStore((s) => s.jwt);
  // Flat router: each authed screen opts into the sunrise/sunset (or stored
  // override) theme. Without this the chat renders the light fallback when
  // landed on directly. Same fix applied to /p/:id and the tour routes.
  useThemeAuto();

  useEffect(() => {
    if (!jwt) void navigate("/?reason=expired", { replace: true });
  }, [jwt, navigate]);

  if (!jwt) return null;

  // Calmest screen, lowest risk: contained editorial column at lg (1024), no
  // rail. Below the floor the byte-identical mobile tree renders.
  return <ResponsiveScreen mobile={<ChatMobile jwt={jwt} />} desktop={<ChatDesktop jwt={jwt} />} />;
}
