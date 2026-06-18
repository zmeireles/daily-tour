import { useTranslation } from "react-i18next";
import { DesktopAppShell } from "@/components/desktop-app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ConversationPanel } from "./conversation-panel";
import { useChatWs } from "./use-chat-ws";

// The host of every Daily Tour guesthouse thread is Miguel (see mobile route).
const HOST_NAME = "Miguel";

// Thin control band below the masthead — Miguel's identity + a cosmetic presence
// line, lifted from the mobile header MINUS the back chevron (the TopNav is the
// way back on desktop).
function ChatSubHeader() {
  const { t } = useTranslation("discover");
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="size-9">
        <AvatarFallback>{HOST_NAME.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h1 className="font-display text-lg font-semibold leading-tight text-on-surface">
          {HOST_NAME}
        </h1>
        <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <span className="inline-block size-2 rounded-full bg-green-500" aria-hidden="true" />
          {/* Cosmetic: no presence system is wired — status is static. */}
          {t("chat.status_online")}
        </p>
      </div>
    </div>
  );
}

// Desktop Chat — the calmest screen. A centered bounded ConversationPanel inside
// the contained editorial column, with an editorial empty state. Reuses
// useChatWs(jwt) (no new data path); the JWT-gate + theme live on the route.
export function ChatDesktop({ jwt }: { jwt: string }) {
  const { messages, status, send } = useChatWs(jwt);

  return (
    <DesktopAppShell frame="contained" subHeader={<ChatSubHeader />}>
      <ConversationPanel messages={messages} status={status} onSend={send} />
    </DesktopAppShell>
  );
}
