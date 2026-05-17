import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSessionStore } from "@/store/session";

const claims = {
  sub: "guest-1",
  rid: "res-1",
  gh: "gh-1",
  locale: "en",
  exp: 9_999_999_999,
};

describe("session store", () => {
  beforeEach(() => {
    useSessionStore.getState().clearSession();
  });

  it("setSession populates all fields from JWT claims", () => {
    useSessionStore.getState().setSession("header.payload.sig", claims);
    const state = useSessionStore.getState();
    expect(state.jwt).toBe("header.payload.sig");
    expect(state.exp).toBe(claims.exp);
    expect(state.reservation).toEqual({ id: "res-1", guesthouseId: "gh-1", locale: "en" });
    expect(state.guest).toEqual({ id: "guest-1", locale: "en" });
  });

  it("clearSession resets all fields to null", () => {
    useSessionStore.getState().setSession("header.payload.sig", claims);
    useSessionStore.getState().clearSession();
    const state = useSessionStore.getState();
    expect(state.jwt).toBeNull();
    expect(state.exp).toBeNull();
    expect(state.reservation).toBeNull();
    expect(state.guest).toBeNull();
  });

  it("never touches localStorage", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem");
    useSessionStore.getState().setSession("header.payload.sig", claims);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
