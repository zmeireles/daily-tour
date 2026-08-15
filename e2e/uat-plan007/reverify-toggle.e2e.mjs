// Single-scenario RE-VERIFICATION — owner per-place visibility toggle on LIVE qual.
// Re-run after the catalog.guesthouse "Casa do Sol" seed fix (#152).
// PRIMARY assertion: the Hide/Show control RENDERS (not the bare "—") AND a
// Hide→Show round-trip persists (2xx + DB write). Leaves data as found.
// playwright-core (repo pnpm store) + system Chrome, headless.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const REPO = "/media/jmeireles/ssd3/my-projects/daily-tour";
const { chromium } = require(
  REPO + "/node_modules/.pnpm/playwright-core@1.60.0/node_modules/playwright-core",
);

const APEX = "https://qual.stay.portugalodyssey.pt";
const AUTH = "https://auth.qual.stay.portugalodyssey.pt";
const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const SHOTS = REPO + "/temp/uat-plan007/";
const GH_SLUG = "casa-do-sol";
mkdirSync(SHOTS, { recursive: true });
const AKPW = readFileSync(SHOTS + ".akpw", "utf8").trim();

const VIEWPORTS = { desktop: { width: 1440, height: 900 } };
const results = [];
const errors = [];
let ctx, page;

function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
async function shot(tag) {
  await page.screenshot({ path: `${SHOTS}${tag}.png`, fullPage: false }).catch(() => {});
  return `${SHOTS}${tag}.png`;
}
async function newPage(browser, viewport = VIEWPORTS.desktop) {
  if (ctx) await ctx.close();
  ctx = await browser.newContext({ viewport, ignoreHTTPSErrors: false });
  page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror[step ${results.length}]: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error")
      errors.push(`console[step ${results.length}]: ${m.text().slice(0, 250)}`);
  });
}
function dbHidden() {
  // Returns the hidden_place_ids text for casa-do-sol (e.g. "{}" or "{uuid}").
  return execFileSync(
    "ssh",
    [
      "-o",
      "ConnectTimeout=12",
      "root@77.37.86.126",
      `docker exec -e PGPASSWORD=postgres dt_postgres psql -U postgres -d dailytour -tAc "select hidden_place_ids from catalog.guesthouse where slug='${GH_SLUG}';"`,
    ],
    { encoding: "utf8" },
  ).trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

await newPage(browser, VIEWPORTS.desktop);
try {
  // ── 1. Owner login via Authentik ────────────────────────────────────────────
  await page.goto(APEX + "/admin", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/auth\.qual\.stay\.portugalodyssey\.pt/, { timeout: 30000 });
  step("S1 /admin redirects to Authentik", page.url().startsWith(AUTH), page.url().split("?")[0]);

  const userField = page.locator('input[name="uidField"]').first();
  await userField.waitFor({ state: "visible", timeout: 20000 });
  await userField.fill("akadmin");
  await page
    .getByRole("button", { name: /^log in$/i })
    .first()
    .click();

  const pwField = page.locator('input[type="password"]:visible').first();
  await pwField.waitFor({ state: "visible", timeout: 20000 });
  await sleep(1200);
  await pwField.click();
  await pwField.fill(AKPW);
  await sleep(300);
  let filledLen = await pwField.evaluate((e) => e.value.length).catch(() => 0);
  if (filledLen === 0) {
    await pwField.fill(AKPW);
    await sleep(400);
    filledLen = await pwField.evaluate((e) => e.value.length).catch(() => 0);
  }
  await page
    .getByRole("button", { name: /continue|log in|sign in/i })
    .first()
    .click();

  await page.waitForFunction(
    () => location.host.endsWith("portugalodyssey.pt") && location.pathname.startsWith("/admin"),
    { timeout: 40000 },
  );
  await sleep(2500);
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  const bodyText =
    (await page
      .locator("body")
      .innerText()
      .catch(() => "")) || "";
  const forbidden = /403|forbidden|not authoriz|unauthor/i.test(bodyText);
  step(
    "S2 backoffice reached (no 403)",
    page.url().includes("/admin") && !forbidden,
    page.url().split("?")[0],
  );
  await shot("R1-backoffice");

  // ── 2. /admin/places renders WITH a working visibility control per row ───────
  await page.goto(APEX + "/admin/places", { waitUntil: "domcontentloaded" });
  const table = page.locator("table");
  await table.waitFor({ state: "visible", timeout: 30000 });
  const rowCount = await page.locator("table tbody tr").count();

  const hideShowBtns = page.getByRole("button", { name: /Toggle guest visibility for/i });
  const btnCount = await hideShowBtns.count();
  // Inspect the Guests/visibility column to PROVE it is no longer all "—".
  const guestCells = await page.locator("table tbody tr td:nth-child(4)").allInnerTexts();
  const allDash = guestCells.length > 0 && guestCells.every((c) => c.trim() === "—");
  const controlRenders = btnCount > 0 && !allDash;
  await shot("R2-places-with-toggle");
  step(
    'S3 visibility control renders per row (#152 resolved — not bare "—")',
    controlRenders,
    `rows=${rowCount} toggleButtons=${btnCount} allDash=${allDash} guestColSample=${JSON.stringify(guestCells.slice(0, 3))}`,
  );
  if (!controlRenders) {
    throw new Error("visibility toggle NOT rendered — #152 still present; aborting round-trip");
  }

  // ── 3. DB baseline before any write ──────────────────────────────────────────
  const dbBefore = dbHidden();
  step("S4 DB baseline casa-do-sol.hidden_place_ids", true, `before="${dbBefore}"`);

  // ── 4. Pick a place currently visible (label "Hide") and HIDE it ─────────────
  const targetBtn = hideShowBtns.first();
  await targetBtn.waitFor({ state: "visible", timeout: 10000 });
  const targetRow = targetBtn.locator("xpath=ancestor::tr");
  const placeName = (await targetRow.locator("td:first-child").innerText()).trim();
  const labelBefore = (await targetBtn.innerText()).trim();

  // Capture the visibility write. Match ANY mutating method (the exact endpoint
  // shape is discovered here, not assumed) — exclude pure asset/GET noise.
  const writes = [];
  const onResp = (resp) => {
    const m = resp.request().method();
    if (!["PATCH", "PUT", "POST", "DELETE"].includes(m)) return;
    const u = resp.url();
    if (/\.(png|jpg|svg|css|js|woff2?)(\?|$)/.test(u)) return;
    writes.push({ m, status: resp.status(), url: u.replace(APEX, "") });
  };
  page.on("response", onResp);

  const nBeforeHide = writes.length;
  await targetBtn.click();
  const hiddenBadge = targetRow.getByText(/^Hidden$/i);
  await hiddenBadge.waitFor({ state: "visible", timeout: 15000 });
  await sleep(800);
  await shot("R3-hidden");
  const hideWrite = writes.slice(nBeforeHide).slice(-1)[0] || null;
  const dbAfterHide = dbHidden();
  const hideOk =
    !!hideWrite &&
    hideWrite.status >= 200 &&
    hideWrite.status < 300 &&
    dbAfterHide !== "{}" &&
    dbAfterHide.includes("-");
  step(
    'S5 Hide → "Hidden" badge + 2xx + DB write',
    hideOk,
    `place="${placeName}" labelBefore="${labelBefore}" write=${hideWrite ? hideWrite.m + " " + hideWrite.status : "none"} dbAfterHide="${dbAfterHide}"`,
  );

  // ── 5. SHOW to revert — leave data as found ──────────────────────────────────
  const showBtn = targetRow.getByRole("button", { name: /Toggle guest visibility for/i });
  const nBeforeShow = writes.length;
  await showBtn.click();
  await hiddenBadge.waitFor({ state: "hidden", timeout: 15000 });
  await sleep(800);
  await shot("R4-reverted");
  const showWrite = writes.slice(nBeforeShow).slice(-1)[0] || null;
  const dbAfterShow = dbHidden();
  page.off("response", onResp);
  const revertOk =
    !!showWrite && showWrite.status >= 200 && showWrite.status < 300 && dbAfterShow === "{}";
  step(
    "S6 Show → badge clears + 2xx + DB reverted to {}",
    revertOk,
    `write=${showWrite ? showWrite.m + " " + showWrite.status : "none"} dbAfterShow="${dbAfterShow}"`,
  );
} catch (e) {
  step("scenario (owner edits a place)", false, String(e.message).slice(0, 220));
  await shot("R-fail");
}

console.log("\n— SUMMARY —");
const fails = results.filter((r) => !r.ok);
console.log(`${results.length - fails.length}/${results.length} steps passed`);
if (errors.length) console.log("\nJS ERRORS / CONSOLE:\n" + errors.join("\n"));
await browser.close();
process.exit(0);
