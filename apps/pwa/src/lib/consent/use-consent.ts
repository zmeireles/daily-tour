import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Analytics = "granted" | "denied" | "unset";

type ConsentState = {
  analytics: Analytics;
  setAnalytics: (v: Analytics) => void;
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      analytics: "unset",
      setAnalytics: (analytics) => set({ analytics }),
    }),
    { name: "consent", storage: createJSONStorage(() => localStorage) },
  ),
);
