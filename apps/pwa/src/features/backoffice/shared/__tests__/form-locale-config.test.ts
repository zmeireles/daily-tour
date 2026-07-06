import { describe, it, expect } from "vitest";
import {
  CONTENT_LOCALES,
  contentLocaleTabKey,
  buildI18nText,
  i18nTextToFields,
} from "../form-locale-config";

describe("CONTENT_LOCALES", () => {
  it("includes es as a first-class locale", () => {
    expect(CONTENT_LOCALES).toContain("es");
  });

  it("includes en and pt-PT", () => {
    expect(CONTENT_LOCALES).toContain("en");
    expect(CONTENT_LOCALES).toContain("pt-PT");
  });
});

describe("contentLocaleTabKey", () => {
  it("maps en → en", () => {
    expect(contentLocaleTabKey("en")).toBe("en");
  });

  it("maps pt-PT → pt_PT (hyphen to underscore)", () => {
    expect(contentLocaleTabKey("pt-PT")).toBe("pt_PT");
  });

  it("maps es → es", () => {
    expect(contentLocaleTabKey("es")).toBe("es");
  });
});

describe("buildI18nText", () => {
  it("maps flat fields to locale keys and omits empty entries", () => {
    const result = buildI18nText({ name_en: "Lake", name_pt: "", name_es: undefined }, "name");
    expect(result).toEqual({ en: "Lake" });
  });

  it("maps pt suffix → pt-PT locale key", () => {
    const result = buildI18nText({ name_en: "Lake", name_pt: "Lago", name_es: "Lago" }, "name");
    expect(result["pt-PT"]).toBe("Lago");
    expect(result["es"]).toBe("Lago");
  });

  it("includes all three locales when all populated", () => {
    const result = buildI18nText({ desc_en: "A", desc_pt: "B", desc_es: "C" }, "desc");
    expect(result).toEqual({ en: "A", "pt-PT": "B", es: "C" });
  });
});

describe("i18nTextToFields", () => {
  it("round-trips with buildI18nText", () => {
    const original = { desc_en: "A", desc_pt: "B", desc_es: "C" };
    const i18n = buildI18nText(original, "desc");
    const roundTripped = i18nTextToFields(i18n, "desc");
    expect(roundTripped).toEqual(original);
  });

  it("fills missing locales with empty string", () => {
    const fields = i18nTextToFields({ en: "Hello" }, "name");
    expect(fields).toEqual({ name_en: "Hello", name_pt: "", name_es: "" });
  });

  it("handles undefined text gracefully", () => {
    const fields = i18nTextToFields(undefined, "bio");
    expect(fields).toEqual({ bio_en: "", bio_pt: "", bio_es: "" });
  });
});
