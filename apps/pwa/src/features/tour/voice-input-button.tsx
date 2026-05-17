import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Minimal typings for the Web Speech API — not yet in the standard TypeScript DOM lib.
interface SpeechRecognitionResultItem {
  transcript: string;
}
interface SpeechRecognitionResultEntry {
  [index: number]: SpeechRecognitionResultItem | undefined;
}
interface SpeechRecognitionResultsEvent {
  results: { [index: number]: SpeechRecognitionResultEntry | undefined };
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultsEvent) => void) | null;
  start: () => void;
}
interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}

// Feature-detect — webkitSpeechRecognition absent on some Safari builds and Firefox.
type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};
const w = typeof window !== "undefined" ? (window as unknown as WindowWithSpeech) : undefined;
const SpeechRecognitionAPI = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const { t } = useTranslation("home");
  const [recording, setRecording] = useState(false);
  const available = !!SpeechRecognitionAPI;

  function startRecording() {
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setRecording(true);
    recognition.onend = () => setRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = () => setRecording(false);
    recognition.start();
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={!available || disabled}
      aria-label={recording ? t("tour.new.voice_recording") : t("tour.new.voice_hint")}
      title={!available ? "Voice input not supported in this browser" : undefined}
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        recording ? "animate-pulse border-primary text-primary" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
