// Deep UAT — verify deploy 7ed39e0 (locale negotiation fix #388 + 10-day guest smoke).
// READ-ONLY. Report-only (exit 0). Screenshots + evidence -> temp/deploy-verify-7ed39e0/.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { isSameOrigin } from "../lib/same-origin.mjs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/deploy-verify-7ed39e0/";
mkdirSync(SHOTS, { recursive: true });

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

// ── Group A: locale negotiation ───────────────────────────────────────────
// browser locale -> expected UI language, per the fix's own claim.
const LOCALE_CASES = [
  { locale: "pt-PT", al: "pt-PT", expect: "pt-PT" },
  { locale: "pt", al: "pt", expect: "pt-PT" },
  { locale: "pt-BR", al: "pt-BR", expect: "pt-PT" },
  { locale: "de", al: "de", expect: "en" },
  { locale: "en-US", al: "en-US", expect: "en" },
  { locale: "es-MX", al: "es-MX", expect: "es" },
  { locale: "fr-CA", al: "fr-CA", expect: "fr" },
];
const localeEvidence = [];
for (const { locale, al, expect } of LOCALE_CASES) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale,
    extraHTTPHeaders: { "Accept-Language": al },
  });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => ({
      navigatorLanguages: navigator.languages,
      htmlLang: document.documentElement.lang,
      i18nextLng: localStorage.getItem("i18nextLng"),
      previewBanner: document.body.innerText.split("\n").filter(Boolean)[0],
      heroLine: document.body.innerText
        .split("\n")
        .filter(Boolean)
        .find((l) => l.includes("São Miguel")),
    }));
    localeEvidence.push({ locale, al, expect, ...info });
    const gotBase =
      (info.i18nextLng || "").split("-")[0].toLowerCase() === expect.split("-")[0].toLowerCase() &&
      (expect !== "pt-PT" || info.i18nextLng === "pt-PT"); // pt-PT must be exact, not just base 'pt'
    step(
      `A locale=${locale} (Accept-Language: ${al}) resolves ${expect}`,
      gotBase,
      `i18nextLng=${info.i18nextLng} banner="${info.previewBanner}" hero="${info.heroLine}"`,
    );
    await page.screenshot({ path: `${SHOTS}locale-${locale}.png` }).catch(() => {});
  } catch (e) {
    step(`A locale=${locale}`, false, e.message.slice(0, 160));
  } finally {
    await ctx.close();
  }
}
writeFileSync(`${SHOTS}locale-evidence.json`, JSON.stringify(localeEvidence, null, 2));

// ── A-control: manual language switcher (bypasses browser-locale detection) ─
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.getByRole("button", { name: "Português" }).click();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => ({
      i18nextLng: localStorage.getItem("i18nextLng"),
      firstLine: document.body.innerText.split("\n").filter(Boolean)[0],
    }));
    step(
      "A-control manual switcher EN->PT works",
      after.i18nextLng === "pt-PT",
      JSON.stringify(after),
    );
    await page.screenshot({ path: `${SHOTS}locale-manual-switch.png` }).catch(() => {});
  } catch (e) {
    step("A-control manual switcher", false, e.message.slice(0, 160));
  } finally {
    await ctx.close();
  }
}

// ── Group B: guest smoke (default en-US context) ─────────────────────────
{
  const errors = [];
  const netFails = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on("response", (r) => {
    const u = r.url();
    if (r.status() >= 400 && isSameOrigin(u, BASE))
      netFails.push(`${r.status()} ${r.request().method()} ${u}`);
  });
  try {
    const resp = await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1000);
    const body = await page.evaluate(() => document.body.innerText);
    const notBlank = body.trim().length > 400;
    step(
      "B1 home loads + renders content",
      resp?.status() === 200 && notBlank,
      `status=${resp?.status()} bodyLen=${body.length}`,
    );
    await page
      .screenshot({ path: `${SHOTS}smoke-home-desktop.png`, fullPage: true })
      .catch(() => {});

    // Direct-nav a server-routed page (privacy) — silent-leak-style check.
    const r2 = await page.goto(BASE + "/privacy", { waitUntil: "networkidle", timeout: 30000 });
    const finalUrl = page.url();
    const priv = await page.evaluate(() => document.body.innerText.trim().length);
    step(
      "B2 direct-nav /privacy renders (same-origin https)",
      r2?.status() === 200 && isSameOrigin(finalUrl, BASE) && priv > 200,
      `status=${r2?.status()} finalUrl=${finalUrl} bodyLen=${priv}`,
    );
    await page.screenshot({ path: `${SHOTS}smoke-privacy.png` }).catch(() => {});

    // Mobile viewport sanity.
    await ctx.close();
  } catch (e) {
    step("B guest smoke", false, e.message.slice(0, 160));
  }

  const benign = /v1\/auth\/refresh/;
  const realFails = netFails.filter((f) => !benign.test(f));
  step(
    "B3 no unexpected 4xx/5xx to own origin",
    realFails.length === 0,
    netFails.length ? `all=${JSON.stringify(netFails)}` : "none observed",
  );
  step(
    "B4 no uncaught JS exceptions / console errors",
    errors.length === 0,
    errors.length ? JSON.stringify([...new Set(errors)]) : "none observed",
  );
}

// ── B-mobile: quick mobile viewport smoke ─────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(800);
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 2,
    );
    const body = await page.evaluate(() => document.body.innerText.trim().length);
    step(
      "B5 mobile viewport renders, no horizontal overflow",
      fits && body > 400,
      `fits=${fits} bodyLen=${body}`,
    );
    await page
      .screenshot({ path: `${SHOTS}smoke-home-mobile.png`, fullPage: true })
      .catch(() => {});
  } catch (e) {
    step("B5 mobile viewport", false, e.message.slice(0, 160));
  } finally {
    await ctx.close();
  }
}

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} passed`);
if (fails.length) {
  console.log("FAILURES:");
  for (const f of fails) console.log(`  ✗ ${f.name} — ${f.detail}`);
}
await browser.close();
process.exit(0);
