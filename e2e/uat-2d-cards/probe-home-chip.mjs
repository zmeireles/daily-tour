import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);
const BASE = "http://127.0.0.1:5173";
const TOKEN = process.env.RTOKEN;
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/r/${TOKEN}`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => location.pathname === "/", { timeout: 30000 }).catch(() => {});
await page.locator('a[href^="/a/"]').first().waitFor({ state: "visible", timeout: 20000 });
await page.evaluate(() => localStorage.setItem("theme", "light"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
await new Promise((r) => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  // Find the host's-picks section by its aria-label heading.
  const section = [...document.querySelectorAll("section")].find((s) =>
    /escolhas|picks|anfitri/i.test(s.getAttribute("aria-label") || ""),
  );
  const out = { sectionFound: !!section };
  if (!section) return out;
  out.cardCount = section.querySelectorAll("h3.font-display").length;
  // All rounded-full spans inside the section (distance chips).
  const chips = [...section.querySelectorAll("span")].filter((s) =>
    /rounded-full/.test(s.className || ""),
  );
  out.chipsInSection = chips.map((c) => ({
    text: c.textContent?.trim(),
    bg: getComputedStyle(c).backgroundColor,
    fg: getComputedStyle(c).color,
    cls: (c.className || "").slice(0, 80),
  }));
  // Per-card: name + whether a chip exists in that card.
  out.cards = [...section.querySelectorAll("h3.font-display")].map((h) => {
    const card = h.closest('[class*="rounded-xl"]') || h.parentElement;
    const chip = [...(card?.querySelectorAll("span") || [])].find((s) =>
      /rounded-full/.test(s.className || ""),
    );
    return { name: h.textContent?.trim(), hasChip: !!chip, chipText: chip?.textContent?.trim() };
  });
  return out;
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
