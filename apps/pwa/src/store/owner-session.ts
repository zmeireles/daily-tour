import { create } from "zustand";

export interface OwnerSessionState {
  jwt: string | null;
  profile: { sub: string; email: string | null; name: string | null } | null;
}

interface OwnerSessionActions {
  setOwnerSession: (jwt: string, profile: OwnerSessionState["profile"]) => void;
  clearOwnerSession: () => void;
}

export const useOwnerSessionStore = create<OwnerSessionState & OwnerSessionActions>((set) => ({
  jwt: null,
  profile: null,
  setOwnerSession: (jwt, profile) => set({ jwt, profile }),
  clearOwnerSession: () => set({ jwt: null, profile: null }),
}));

export const useOwnerJwt = () => useOwnerSessionStore((s) => s.jwt);
export const useOwnerProfile = () => useOwnerSessionStore((s) => s.profile);
