import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();

vi.mock("idb-keyval", () => ({
  createStore: vi.fn(() => ({})),
  get: vi.fn((key: string) => Promise.resolve(store.get(key))),
  set: vi.fn((key: string, value: string) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  del: vi.fn((key: string) => {
    store.delete(key);
    return Promise.resolve();
  }),
}));

const { idbStorage } = await import("@/lib/offline/cache");

beforeEach(() => {
  store.clear();
});

describe("idbStorage", () => {
  it("returns null for a key that has not been set", async () => {
    const result = await idbStorage.getItem("nonexistent");
    expect(result).toBeNull();
  });

  it("round-trips a string value via setItem + getItem", async () => {
    await idbStorage.setItem("cache-key", "cache-value");
    expect(await idbStorage.getItem("cache-key")).toBe("cache-value");
  });

  it("removeItem deletes the key so getItem returns null", async () => {
    await idbStorage.setItem("to-delete", "some-value");
    await idbStorage.removeItem("to-delete");
    expect(await idbStorage.getItem("to-delete")).toBeNull();
  });
});
