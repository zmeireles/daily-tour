// Triage for UAT #30 S8-mobile: did the place-detail tap fail because of an app
// defect, or because the analytics-consent banner overlays the bottom sheet?
// READ-ONLY — navigates a guest session over pre-existing seeded places only.
import { readdirSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const OUT = resolve(repoRoot, "temp/uat30-picker");
mkdirSync(OUT, { recursive: true });
const GUEST_URL = `https://qual.stay.portugalodyssey.pt/r/${process.env.RTOKEN}`;

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox"],
});

for (const [tag, dismiss] of [
  ["banner-left-up", false],
  ["banner-dismissed", true],
]) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "pt-PT" });
  const page = await ctx.newPage();
  await page.goto(GUEST_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page
    .locator('a[href*="/a/eat"]')
    .first()
    .click()
    .catch(() => {});
  await page.waitForURL(/\/a\/eat/, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const bannerVisible = await page
    .getByRole("button", { name: /Aceitar|Recusar/ })
    .first()
    .isVisible()
    .catch(() => false);
  if (dismiss) {
    await page
      .getByRole("button", { name: /Recusar/ })
      .first()
      .click()
      .catch(() => {});
    await page.waitForTimeout(1200);
  }

  // Tap the first place card in the "Por perto" sheet.
  const card = page.locator('[href*="/p/"], [data-testid*="place"], article').first();
  let clicked = false;
  try {
    await card.click({ timeout: 8000 });
    clicked = true;
  } catch (e) {
    console.log(`[${tag}] card click threw: ${String(e.message).split("\n")[0]}`);
  }
  await page.waitForURL(/\/p\//, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(OUT, `triage-${tag}.png`) });
  console.log(
    `[${tag}] bannerVisibleBefore=${bannerVisible} clicked=${clicked} url=${page.url().replace("https://qual.stay.portugalodyssey.pt", "")}`,
  );
  await ctx.close();
}
await browser.close();
