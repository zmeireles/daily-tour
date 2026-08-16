// READ-ONLY triage: what does the owner console show when opening an ARCHIVED
// place? (No save, no mutation — just loads the form and reads fields.)
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isSameOrigin } from "../lib/same-origin.mjs";

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const BASE = "https://qual.stay.portugalodyssey.pt";
const AUTHORITY = "https://auth.qual.stay.portugalodyssey.pt/application/o/owner-app/";
const CLIENT_ID = "owner-app-public";
const PLACE_ID = "c1278d1f-5485-430a-bb96-ce6678cf58e7";
const OUT = resolve(repoRoot, "temp/uat30-picker");

const AK_PW = readFileSync(resolve(repoRoot, "temp/qual-uat-secrets.env"), "utf8")
  .split("\n")
  .find((l) => l.startsWith("AKADMIN_PASSWORD="))
  ?.slice("AKADMIN_PASSWORD=".length)
  .trim();

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox"],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "pt-PT" });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept().catch(() => {}));

await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await page.waitForURL(/auth\.qual/, { timeout: 25000 });
await page.locator('input[name="uidField"]').fill("akadmin");
await page.locator('input[name="uidField"]').press("Enter");
await page.locator('input[name="password"]').waitFor({ timeout: 15000 });
await page.locator('input[name="password"]').fill(AK_PW);
await page.locator('input[name="password"]').press("Enter");
for (let i = 0; i < 25 && !isSameOrigin(page.url(), BASE); i++) {
  const s = page.locator('button[type="submit"]');
  if (await s.count())
    await s
      .first()
      .click()
      .catch(() => {});
  await page.waitForTimeout(1000);
}
await page.waitForFunction(
  ([a, c]) => !!localStorage.getItem(`oidc.user:${a}:${c}`),
  [AUTHORITY, CLIENT_ID],
  { timeout: 25000 },
);
await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15000 });

// Does the archived place appear in the owner list at all?
await page.goto(`${BASE}/admin/places`, { waitUntil: "networkidle", timeout: 40000 });
await page.waitForTimeout(1500);
const inList = await page
  .getByText("ZZ-UAT30")
  .first()
  .isVisible()
  .catch(() => false);
const statusFilter = page.locator("select").first();
const filterOpts = await statusFilter
  .locator("option")
  .allTextContents()
  .catch(() => []);
await page.screenshot({ path: resolve(OUT, "triage-archived-list.png") });

// Open the archived place's form directly.
await page.goto(`${BASE}/admin/places/${PLACE_ID}`, { waitUntil: "networkidle", timeout: 40000 });
await page.waitForTimeout(2000);
const nameVal = await page
  .locator('[name="name_pt"]')
  .inputValue()
  .catch(() => "<no field>");
const statusVal = await page
  .locator('select:has(option[value="published"])')
  .inputValue()
  .catch(() => "<none>");
const comerPressed = await page
  .getByRole("button", { name: /^(Comer|Eat)$/ })
  .and(page.locator("[aria-pressed]"))
  .first()
  .getAttribute("aria-pressed")
  .catch(() => null);
await page.screenshot({ path: resolve(OUT, "triage-archived-form.png") });

console.log(`archivedInOwnerList=${inList}`);
console.log(`statusFilterOptions=[${filterOpts.map((s) => s.trim()).join(" | ")}]`);
console.log(`form: name_pt="${nameVal}" statusSelect="${statusVal}" ComerPressed=${comerPressed}`);
console.log(`(no save performed — read-only)`);
await browser.close();
