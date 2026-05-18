import { useMutation } from "@tanstack/react-query";
import { useSessionStore } from "@/store/session";

export interface FeedbackPayload {
  rating: number;
  text?: string;
}

async function postFeedback(payload: FeedbackPayload, jwt: string): Promise<void> {
  const res = await fetch("/v1/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`feedback failed: ${res.status}`);
}

export function useFeedback() {
  const jwt = useSessionStore((s) => s.jwt);
  return useMutation({
    mutationFn: (payload: FeedbackPayload) => {
      if (!jwt) return Promise.reject(new Error("unauthenticated"));
      return postFeedback(payload, jwt);
    },
  });
}
