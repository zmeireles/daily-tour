import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSessionStore } from "@/store/session";
import { useFeedback } from "./use-feedback";

const EMOJI_RATINGS = ["😞", "😕", "😐", "🙂", "😄"] as const;

export function FeedbackDrawer() {
  const { t } = useTranslation("common");
  const jwt = useSessionStore((s) => s.jwt);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useFeedback();

  if (!jwt) return null;

  function handleOpen() {
    setOpen(true);
    setSubmitted(false);
    setRating(0);
    setText("");
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    await mutation.mutateAsync({ rating, text: text.trim() || undefined });
    setSubmitted(true);
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={t("feedback.open", "Send feedback")}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t("feedback.button", "Feedback")}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("feedback.title", "Send feedback")}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} aria-hidden="true" />
          <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">{t("feedback.title", "Send feedback")}</h2>

            {submitted ? (
              <p className="text-center text-muted-foreground py-4">
                {t("feedback.thanks", "Thank you for your feedback!")}
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  void handleSubmit(e);
                }}
              >
                <p className="text-sm text-muted-foreground mb-3">
                  {t("feedback.rating_label", "How was your experience?")}
                </p>
                <div
                  className="flex gap-3 justify-center mb-4"
                  role="group"
                  aria-label={t("feedback.rating_label", "Rating")}
                >
                  {EMOJI_RATINGS.map((emoji, idx) => {
                    const value = idx + 1;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        aria-pressed={rating === value}
                        aria-label={`${value} ${t("feedback.star", "star")}`}
                        className={`text-2xl rounded-lg p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          rating === value ? "ring-2 ring-primary scale-110" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("feedback.text_placeholder", "Tell us more (optional)…")}
                  maxLength={2000}
                  rows={3}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none mb-4"
                />

                {mutation.isError && (
                  <p className="text-destructive text-sm mb-2" role="alert">
                    {t("feedback.error", "Failed to send. Please try again.")}
                  </p>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {t("feedback.cancel", "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={rating === 0 || mutation.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mutation.isPending
                      ? t("feedback.sending", "Sending…")
                      : t("feedback.submit", "Send")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
