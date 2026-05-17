import { create } from "zustand";

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPromptState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  visitCount: number;
  setDeferredPrompt: (evt: BeforeInstallPromptEvent | null) => void;
  setVisitCount: (count: number) => void;
  dismiss: () => void;
}

export const useInstallPromptStore = create<InstallPromptState>((set) => ({
  deferredPrompt: null,
  visitCount: 0,
  setDeferredPrompt: (evt) => set({ deferredPrompt: evt }),
  setVisitCount: (count) => set({ visitCount: count }),
  dismiss: () => set({ deferredPrompt: null }),
}));
