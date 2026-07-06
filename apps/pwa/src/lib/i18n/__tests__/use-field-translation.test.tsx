import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

import { useFieldTranslation } from "@/lib/i18n/use-field-translation";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Controllable owner JWT — the hook reads it at render time.
const { getJwt } = vi.hoisted(() => ({ getJwt: vi.fn<[], string | null>(() => "jwt-token") }));
vi.mock("@/store/owner-session", () => ({ useOwnerJwt: () => getJwt() }));

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function setupHook(values: Record<string, string>, sourceLocale: "en" | "pt-PT" | "es" = "pt-PT") {
  const setValue = vi.fn();
  const getValues = vi.fn((name: string) => values[name] ?? "");
  const { result } = renderHook(() => useFieldTranslation({ setValue, getValues, sourceLocale }), {
    wrapper,
  });
  return { result, setValue, getValues };
}

function mockFetchOk(translations: unknown) {
  (global.fetch as Mock).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ translations }),
  });
}

describe("useFieldTranslation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJwt.mockReturnValue("jwt-token");
    global.fetch = vi.fn();
  });

  it("translateField writes the target field and resolves true on success", async () => {
    mockFetchOk([{ key: "description", values: [{ locale: "es", text: "hola mundo" }] }]);
    const { result, setValue } = setupHook({ description_pt: "olá mundo" });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.translateField("description", ["es"], "prose");
    });

    expect(ok).toBe(true);
    expect(setValue).toHaveBeenCalledWith("description_es", "hola mundo", { shouldDirty: true });
  });

  it("translateField resolves false (never rejects) and toasts on an HTTP failure — Save is never blocked", async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: false, status: 500 });
    const { result, setValue } = setupHook({ description_pt: "olá mundo" });

    let ok: boolean | undefined;
    await act(async () => {
      // Must not throw.
      ok = await result.current.translateField("description", ["es"]);
    });

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalled();
    expect(setValue).not.toHaveBeenCalled();
  });

  it("translateField no-ops (false, no fetch) when the owner JWT is absent", async () => {
    getJwt.mockReturnValue(null);
    const { result, setValue } = setupHook({ description_pt: "olá mundo" });

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.translateField("description", ["es"]);
    });

    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(setValue).not.toHaveBeenCalled();
  });

  it("translateAll requests only empty target locales (never clobbers non-empty)", async () => {
    mockFetchOk([{ key: "description", values: [{ locale: "en", text: "hi" }] }]);
    // pt is source; en target empty, es target already filled → only en requested.
    const { result } = setupHook({
      description_pt: "olá",
      description_en: "",
      description_es: "existente",
    });

    await act(async () => {
      await result.current.translateAll([{ namePrefix: "description" }]);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body as string) as {
      target_locales: string[];
    };
    expect(body.target_locales).toEqual(["en"]);
  });

  it("translateAll skips fields whose source is empty and toasts once on failure", async () => {
    (global.fetch as Mock).mockResolvedValue({ ok: false, status: 502 });
    const { result } = setupHook({ description_pt: "olá", name_pt: "" });

    await act(async () => {
      await result.current.translateAll([{ namePrefix: "name" }, { namePrefix: "description" }]);
    });

    // name has an empty source → skipped; description fails → one aggregate toast.
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
