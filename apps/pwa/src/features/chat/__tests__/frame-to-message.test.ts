import { describe, it, expect } from "vitest";
import { frameToMessage } from "@/features/chat/use-chat-ws";

// U3 (T-4.0.x): the guest client maps server frames to ChatMessages. The host
// is always "them" from the guest's perspective; acks never render a bubble.
describe("frameToMessage", () => {
  it("maps an explicit host message frame to a 'them' bubble", () => {
    const msg = frameToMessage(JSON.stringify({ type: "message", from: "host", body: "Olá!" }));
    expect(msg).not.toBeNull();
    expect(msg?.from).toBe("them");
    expect(msg?.body).toBe("Olá!");
  });

  it("returns null for ack frames (delivery receipt only)", () => {
    expect(frameToMessage(JSON.stringify({ type: "ack", id: "m1" }))).toBeNull();
  });

  it("still renders a legacy {body} frame as a 'them' bubble (behavior-preserving)", () => {
    const msg = frameToMessage(JSON.stringify({ body: "olá de volta" }));
    expect(msg?.from).toBe("them");
    expect(msg?.body).toBe("olá de volta");
  });
});
