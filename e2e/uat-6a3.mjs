// Forward-flow browser UAT for Plan-006 T-6.A.3: owner hides a place via the
// real /admin backoffice UI, driven through a real Authentik OIDC login in a
// headless Chromium. Asserts the click persists to catalog (hidden_place_ids)
// and that the toggle round-trips (Hide -> Show). Run from apps/pwa:
//   AK_PW=... node ../../temp/uat-6a3.mjs
import { chromium } from "@playwright/test";

const PW = process.env.AK_PW;
const APP = "http://localhost:5173";
const AUTHORITY = "http://localhost:9000/application/o/owner-app/";
const CLIENT = "owner-app-public";

const log = (...a) => console.log("  ", ...a);
const fail = (m) => {
  console.error("\n❌ UAT FAILED:", m);
  process.exit(1);
};

// Pin to an already-downloaded Chromium build (the installed Playwright expects
// a newer headless-shell that isn't cached; avoids a fresh download).
const browser = await chromium.launch({
  executablePath: "/home/jmeireles/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
});
const page = await browser.newPage();
page.on("console", (m) => {
  if (m.type() === "error") log("[browser console error]", m.text().slice(0, 160));
});

try {
  // 1. Hit /admin -> oidc-client redirects to Authentik login.
  await page.goto(`${APP}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/localhost:9000/, { timeout: 15000 });
  log("redirected to Authentik login");

  // 2. Identification stage (Authentik lit components; Playwright pierces shadow
  //    DOM). Submit via Enter — the submit button lives in nested shadow roots.
  const uid = page.locator('input[name="uidField"]');
  await uid.waitFor({ timeout: 15000 });
  await uid.fill("akadmin");
  await uid.press("Enter");

  // 3. Password stage.
  const pw = page.locator('input[name="password"]');
  await pw.waitFor({ timeout: 15000 });
  await pw.fill(PW);
  await pw.press("Enter");

  // 4. Back to the backoffice (poll; click through a consent stage if present).
  for (let i = 0; i < 25 && !/localhost:5173/.test(page.url()); i++) {
    const submit = page.locator('button[type="submit"]');
    if (await submit.count())
      await submit
        .first()
        .click()
        .catch(() => {});
    await page.waitForTimeout(1000);
  }
  // /admin/callback exchanges the code, stores the oidc user, then routes to
  // /admin. Wait for the callback to finish (token persisted in localStorage).
  await page.waitForFunction(
    ([authority, client]) => !!localStorage.getItem(`oidc.user:${authority}:${client}`),
    [AUTHORITY, CLIENT],
    { timeout: 20000 },
  );
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15000 });
  log("logged in -> backoffice");

  // helper: call the owner-gated BFF with the token oidc-client stored.
  const ghState = async () => {
    return await page.evaluate(
      async ([authority, client]) => {
        const raw = localStorage.getItem(`oidc.user:${authority}:${client}`);
        const token = JSON.parse(raw).access_token;
        const r = await fetch("/v1/admin/guesthouses", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const j = await r.json();
        return { status: r.status, gh: j.data?.[0] };
      },
      [AUTHORITY, CLIENT],
    );
  };

  const before = await ghState();
  if (before.status !== 200) fail(`owner guesthouses fetch ${before.status}`);
  const baseline = before.gh.hidden_place_ids;
  log(`baseline hidden_place_ids: [${baseline.join(", ")}] (gh=${before.gh.id})`);

  // 5. Go to places, click "Hide" on the first currently-visible place.
  await page.goto(`${APP}/admin/places`, { waitUntil: "domcontentloaded" });
  await page.locator("table tbody tr").first().waitFor({ timeout: 15000 });
  const hideBtn = page
    .getByRole("button", { name: /Toggle guest visibility/ })
    .filter({ hasText: "Hide" })
    .first();
  await hideBtn.waitFor({ timeout: 10000 });
  const row = page.locator("tr", { has: hideBtn });
  const placeName = (await row.locator("td").first().innerText()).trim();
  log(`hiding place: "${placeName}"`);
  await hideBtn.click();

  // 6. UI reflects hidden: the row's button flips to "Show" + "Hidden" badge.
  await page
    .locator("tr", { hasText: placeName })
    .getByRole("button", { name: /Toggle guest visibility/ })
    .filter({ hasText: "Show" })
    .first()
    .waitFor({ timeout: 10000 });
  log('UI shows "Show" + Hidden badge after click');

  // 7. Catalog persisted the hide (owner UI -> BFF PUT -> catalog).
  const afterHide = await ghState();
  const added = afterHide.gh.hidden_place_ids.filter((id) => !baseline.includes(id));
  if (added.length !== 1)
    fail(`expected exactly 1 newly-hidden id, got [${afterHide.gh.hidden_place_ids.join(", ")}]`);
  const hiddenId = added[0];
  log(`✓ catalog persisted hide: hidden_place_ids now contains ${hiddenId}`);

  // 8. Toggle back (Show) and assert it reverts in catalog.
  const showBtn = page
    .locator("tr", { hasText: placeName })
    .getByRole("button", { name: /Toggle guest visibility/ })
    .filter({ hasText: "Show" })
    .first();
  await showBtn.click();
  await page
    .locator("tr", { hasText: placeName })
    .getByRole("button", { name: /Toggle guest visibility/ })
    .filter({ hasText: "Hide" })
    .first()
    .waitFor({ timeout: 10000 });
  const afterShow = await ghState();
  if (afterShow.gh.hidden_place_ids.includes(hiddenId)) fail("unhide did not revert catalog");
  log(
    `✓ catalog reverted unhide: hidden_place_ids back to [${afterShow.gh.hidden_place_ids.join(", ")}]`,
  );

  console.log(
    "\n✅ T-6.A.3 BROWSER UAT PASSED: real OIDC login -> owner Hide/Show toggle -> catalog persistence round-trips.",
  );
  console.log(`   (place "${placeName}" id=${hiddenId})`);
} catch (e) {
  try {
    log("DIAG url:", page.url());
    const txt = await page.evaluate(() => document.body?.innerText?.slice(0, 600) ?? "");
    log("DIAG visible text:", JSON.stringify(txt));
    await page.screenshot({ path: "/tmp/uat-6a3-fail.png", fullPage: true });
    log("DIAG screenshot: /tmp/uat-6a3-fail.png");
  } catch {}
  throw e;
} finally {
  await browser.close();
}
