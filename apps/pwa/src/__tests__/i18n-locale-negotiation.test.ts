import { describe, it, expect, afterAll } from "vitest";
import i18n from "@/lib/i18n";

// #383 — guests on pt, pt-BR or de used to get a wholly English UI. token-svc's
// locale CHECK accepts six locales; the app ships four, and nothing negotiated
// between them, so an unshipped tag fell straight through to English — silently,
// because it reads as a preference rather than a failure.
//
// ⚠️ These are not cosmetic. The first attempted fix used
// `nonExplicitSupportedLngs: true`, which resolves a tag to its BASE language
// (pt-PT -> pt) and, because no `pt` bundle exists, sent **pt-PT itself** to
// English — breaking the primary guest locale outright. It looked right and
// read right. Only running it caught it. That is what the pt-PT row below
// exists to prevent from ever shipping.
describe("locale negotiation (#383)", () => {
  const original = i18n.language;

  afterAll(async () => {
    await i18n.changeLanguage(original);
  });

  it.each([
    // tag detected      resolves to   why it matters
    ["pt-PT", "pt-PT"], // the primary guest locale — must never regress
    ["pt-pt", "pt-PT"], // i18next normalizes casing
    ["pt", "pt-PT"], // region-less: a plausible browser ordering
    ["pt-BR", "pt-PT"], // token-svc accepts this; European PT is the closest we ship
    ["en-US", "en"],
    ["es-MX", "es"],
    ["fr-CA", "fr"],
    ["de", "en"], // de/ exists on disk but is never imported — English is correct
    ["zz", "en"], // unknown tag falls back rather than erroring
  ])("%s resolves to %s", async (tag, expected) => {
    await i18n.changeLanguage(tag);
    expect(i18n.resolvedLanguage).toBe(expected);
  });

  it("actually renders Portuguese for a bare pt browser, not just resolves to it", async () => {
    await i18n.changeLanguage("pt");
    // A resolvedLanguage assertion alone would pass even if the bundle were
    // missing, so pin a real string from the pt-PT common namespace.
    expect(i18n.t("auth.bootstrapping")).toBe("A restaurar a sua sessão…");
  });
});
