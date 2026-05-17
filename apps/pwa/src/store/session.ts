import { create } from "zustand";

export interface SessionState {
  jwt: string | null;
  exp: number | null;
  reservation: { id: string; guesthouseId: string; locale: string } | null;
  guest: { id: string; locale: string } | null;
}

interface SessionActions {
  setSession: (
    jwt: string,
    claims: { sub: string; rid: string; gh: string; locale: string; exp: number },
  ) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  jwt: null,
  exp: null,
  reservation: null,
  guest: null,
  setSession: (jwt, claims) =>
    set({
      jwt,
      exp: claims.exp,
      reservation: { id: claims.rid, guesthouseId: claims.gh, locale: claims.locale },
      guest: { id: claims.sub, locale: claims.locale },
    }),
  clearSession: () => set({ jwt: null, exp: null, reservation: null, guest: null }),
}));

export const useJwt = () => useSessionStore((s) => s.jwt);
export const useSession = () =>
  useSessionStore((s) => ({
    jwt: s.jwt,
    exp: s.exp,
    reservation: s.reservation,
    guest: s.guest,
  }));
