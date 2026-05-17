import { useEffect } from "react";
import { type BeforeInstallPromptEvent, useInstallPromptStore } from "./install-prompt";

const STORAGE_KEY = "pwa_visit_count";

function readVisitCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function writeVisitCount(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // storage unavailable — silently ignore
  }
}

export function useInstallPrompt() {
  const { deferredPrompt, visitCount, setDeferredPrompt, setVisitCount, dismiss } =
    useInstallPromptStore();

  useEffect(() => {
    const count = readVisitCount() + 1;
    writeVisitCount(count);
    setVisitCount(count);
  }, [setVisitCount]);

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, [setDeferredPrompt]);

  const canInstall = deferredPrompt !== null && visitCount >= 2;

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return { canInstall, install, dismiss };
}
