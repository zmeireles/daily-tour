// Forward-flow browser UAT for Plan-006 owner-backoffice UI on the LOCAL dev stack.
// Drives a real Authentik OIDC login (akadmin) in headless Chromium, then exercises:
//   A) /admin/reservations — list + Issue/Revoke token round-trip (6.E.1)
//   B) /admin/places/:id    — contacts + weekly hours + season save->reopen (6.F.0/6.F.1)
//   C) guest-side hero      — /r/<token> session -> /p/<id> hero image renders (6.C.2)
// Report-only: collects per-scenario verdicts, screenshots to temp/uat-plan006/,
// and prints a summary. Run from apps/pwa:
//   AK_PW="$(grep '^AUTHENTIK_BOOTSTRAP_PASSWORD=' ../../.env | cut -d= -f2-)" node ../../temp/uat-plan006.mjs
import { createRequire } from "node:module";
// Resolve @playwright/test from the pwa workspace (pnpm store) regardless of
// this script's location under temp/.
const require = createRequire("/media/jmeireles/ssd3/my-projects/daily-tour/apps/pwa/");
const { chromium } = require("@playwright/test");

const PW = process.env.AK_PW;
const APP = "http://localhost:5173";
const AUTHORITY = "http://localhost:9000/application/o/owner-app/";
const CLIENT = "owner-app-public";
const SHOTS = "/media/jmeireles/ssd3/my-projects/daily-tour/temp/uat-plan006";
const EXEC = "/home/jmeireles/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome";

// Reservation 2 (Test Guest PT) is the clean Issue candidate: token_state "none",
// checkout 2026-07-15 still in the future. Reservation 1's window has passed.
const RES2 = "ccc00001-0000-4000-c000-000000000002";
// Published landmark with a Wikimedia Commons hero (all 28 seeded places have media).
const PLACE_HERO = "c0000001-0000-4000-a000-000000000001";

if (!PW) {
  console.error("AK_PW env var is required (Authentik akadmin password).");
  process.exit(2);
}

const results = [];
const step = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: EXEC });

// Attach console/pageerror capture to a page, tagged with the current scenario.
function instrument(page, tag, sink) {
  page.on("console", (m) => {
    if (m.type() === "error") sink.push(`[${tag} console] ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => sink.push(`[${tag} pageerror] ${String(e).slice(0, 200)}`));
}

const shot = async (page, name) => {
  const path = `${SHOTS}/${name}.png`;
  await page.screenshot({ path, fullPage: true }).catch(() => {});
  return path;
};

// Reusable OIDC login (lifted from temp/uat-6a3.mjs — the proven path).
async function ownerLogin(page) {
  await page.goto(`${APP}/admin`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/localhost:9000/, { timeout: 15000 });
  const uid = page.locator('input[name="uidField"]');
  await uid.waitFor({ timeout: 15000 });
  await uid.fill("akadmin");
  await uid.press("Enter");
  const pw = page.locator('input[name="password"]');
  await pw.waitFor({ timeout: 15000 });
  await pw.fill(PW);
  await pw.press("Enter");
  for (let i = 0; i < 25 && !/localhost:5173/.test(page.url()); i++) {
    const submit = page.locator('button[type="submit"]');
    if (await submit.count())
      await submit
        .first()
        .click()
        .catch(() => {});
    await page.waitForTimeout(1000);
  }
  await page.waitForFunction(
    ([authority, client]) => !!localStorage.getItem(`oidc.user:${authority}:${client}`),
    [AUTHORITY, CLIENT],
    { timeout: 20000 },
  );
  await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15000 });
}

// Read the owner access token oidc-client stored, for direct BFF corroboration.
const ownerToken = (page) =>
  page.evaluate(
    ([authority, client]) =>
      JSON.parse(localStorage.getItem(`oidc.user:${authority}:${client}`)).access_token,
    [AUTHORITY, CLIENT],
  );

// Fetch a reservation's current token_state from the owner-gated BFF list.
async function resState(page, id) {
  return page.evaluate(
    async ([authority, client, rid]) => {
      const token = JSON.parse(
        localStorage.getItem(`oidc.user:${authority}:${client}`),
      ).access_token;
      const r = await fetch("/v1/admin/reservations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      const row = (j.data ?? []).find((x) => x.id === rid);
      return {
        status: r.status,
        token_state: row?.token_state,
        guest_name: row?.guest_name,
        count: j.data?.length,
      };
    },
    [AUTHORITY, CLIENT, id],
  );
}

// ---------------------------------------------------------------------------
// Scenario A — Reservations screen (6.E.1): list + Issue/Revoke round-trip.
// ---------------------------------------------------------------------------
let issuedGuestToken = null; // captured for Scenario C reuse if still active
{
  const tag = "A";
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  instrument(page, tag, errs);
  try {
    await ownerLogin(page);
    step("A1 owner OIDC login -> /admin", true, page.url());

    // Navigate via the nav link (role=link "Reservations") to prove it exists.
    const navLink = page.getByRole("link", { name: /reservations/i }).first();
    await navLink.waitFor({ timeout: 10000 });
    await navLink.click();
    await page.waitForURL((u) => u.pathname === "/admin/reservations", { timeout: 10000 });

    // List renders the 2 seeded rows.
    await page.locator("table tbody tr").first().waitFor({ timeout: 15000 });
    const rowCount = await page.locator("table tbody tr").count();
    const bodyText = await page.locator("table tbody").innerText();
    const hasGuests = /Test Guest EN/.test(bodyText) && /Test Guest PT/.test(bodyText);
    const listPath = await shot(page, "A-reservations-list");
    step(
      "A2 reservations list renders 2 seeded rows",
      rowCount === 2 && hasGuests,
      `rows=${rowCount}, guests EN+PT=${hasGuests}, shot=${listPath}`,
    );

    // Locate the Test Guest PT row (reservation 2 — clean Issue candidate).
    const ptRow = page.locator("tr", { hasText: "Test Guest PT" });
    const before = await resState(page, RES2);

    // Click Issue on that row -> copyable guest link appears.
    const issueBtn = ptRow.getByRole("button", { name: /issue/i }).first();
    await issueBtn.waitFor({ timeout: 10000 });
    await issueBtn.click();

    const linkInput = ptRow.getByRole("textbox", { name: /guest link/i }).first();
    await linkInput.waitFor({ timeout: 15000 });
    const linkVal = await linkInput.inputValue();
    const m = linkVal.match(/\/r\/([^/\s]+)$/);
    if (m) issuedGuestToken = m[1];
    const linkOk = /^http:\/\/localhost:5173\/r\/.+/.test(linkVal);
    const issuePath = await shot(page, "A-issue-link");

    // Token state round-trips to "active" after refetch.
    let afterIssue = before;
    for (let i = 0; i < 10 && afterIssue.token_state !== "active"; i++) {
      await page.waitForTimeout(800);
      afterIssue = await resState(page, RES2);
    }
    step(
      "A3 Issue produces guest link + token_state -> active",
      linkOk && afterIssue.token_state === "active",
      `before=${before.token_state} after=${afterIssue.token_state} link=${linkVal.slice(0, 48)}... shot=${issuePath}`,
    );

    // Click Revoke -> token state reverts to revoked/none.
    const revokeBtn = ptRow.getByRole("button", { name: /revoke/i }).first();
    await revokeBtn.waitFor({ timeout: 10000 });
    await revokeBtn.click();
    let afterRevoke = afterIssue;
    for (let i = 0; i < 10 && afterRevoke.token_state === "active"; i++) {
      await page.waitForTimeout(800);
      afterRevoke = await resState(page, RES2);
    }
    const revokePath = await shot(page, "A-after-revoke");
    step(
      "A4 Revoke -> token_state no longer active",
      afterRevoke.token_state !== "active",
      `after revoke=${afterRevoke.token_state} shot=${revokePath}`,
    );
    // The revoke invalidated the issued token; mark it unusable for Scenario C.
    issuedGuestToken = null;
  } catch (e) {
    const p = await shot(page, "A-fail");
    step("A scenario threw", false, `${String(e).slice(0, 160)} shot=${p}`);
  } finally {
    if (errs.length) console.log("   JS errors (A):", JSON.stringify(errs));
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Scenario B — Place form contacts + hours + season (6.F.0/6.F.1).
// ---------------------------------------------------------------------------
let placeBId = null;
{
  const tag = "B";
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  instrument(page, tag, errs);
  // Tagged test data per explicit sanction.
  const phone = "+351912345678";
  const email = "uat-plan006@example.test";
  const website = "https://uat-plan006.example.test";
  try {
    await ownerLogin(page);
    await page.goto(`${APP}/admin/places`, { waitUntil: "domcontentloaded" });
    await page.locator("table tbody tr").first().waitFor({ timeout: 15000 });

    // Open the first place's edit form. Rows link to /admin/places/:id via an Edit
    // control or the row itself — click the first Edit link/button.
    const editLink = page
      .getByRole("link", { name: /edit/i })
      .or(page.getByRole("button", { name: /edit/i }))
      .first();
    await editLink.waitFor({ timeout: 10000 });
    await editLink.click();
    await page.waitForURL(/\/admin\/places\/[0-9a-f-]+$/, { timeout: 10000 });
    placeBId = page.url().split("/").pop();

    // The three controls render.
    const phoneIn = page.getByRole("textbox", { name: /phone/i }).first();
    const emailIn = page.getByRole("textbox", { name: /email/i }).first();
    const siteIn = page.getByRole("textbox", { name: /website/i }).first();
    const seasonSel = page.getByRole("combobox", { name: /season/i }).first();
    // Hours: the Monday open time input by its aria-label.
    const monOpen = page.getByLabel(/opening time/i).first();
    const monClose = page.getByLabel(/closing time/i).first();

    await phoneIn.waitFor({ timeout: 10000 });
    const controlsRender =
      (await phoneIn.count()) > 0 &&
      (await emailIn.count()) > 0 &&
      (await siteIn.count()) > 0 &&
      (await seasonSel.count()) > 0 &&
      (await monOpen.count()) > 0;
    step("B1 contacts + hours + season controls render", controlsRender, `place=${placeBId}`);

    // Fill the values.
    await phoneIn.fill(phone);
    await emailIn.fill(email);
    await siteIn.fill(website);
    await monOpen.fill("09:00");
    await monClose.fill("17:00");
    await seasonSel.selectOption("summer");
    const filledPath = await shot(page, "B-form-filled");

    // Save and return to the list.
    await page
      .getByRole("button", { name: /^save$/i })
      .first()
      .click();
    await page.waitForURL((u) => u.pathname === "/admin/places", { timeout: 15000 });
    step("B2 form filled + Save navigates back to list", true, `shot=${filledPath}`);

    // Reopen the SAME place edit form -> assert persisted values.
    await page.goto(`${APP}/admin/places/${placeBId}`, { waitUntil: "domcontentloaded" });
    const phone2 = page.getByRole("textbox", { name: /phone/i }).first();
    await phone2.waitFor({ timeout: 10000 });
    const gotPhone = await phone2.inputValue();
    const gotEmail = await page.getByRole("textbox", { name: /email/i }).first().inputValue();
    const gotSite = await page
      .getByRole("textbox", { name: /website/i })
      .first()
      .inputValue();
    const gotMonOpen = await page
      .getByLabel(/opening time/i)
      .first()
      .inputValue();
    const gotMonClose = await page
      .getByLabel(/closing time/i)
      .first()
      .inputValue();
    const gotSeason = await page
      .getByRole("combobox", { name: /season/i })
      .first()
      .inputValue();
    const reopenPath = await shot(page, "B-form-reopened");

    const persisted =
      gotPhone === phone &&
      gotEmail === email &&
      gotSite === website &&
      gotMonOpen === "09:00" &&
      gotMonClose === "17:00" &&
      gotSeason === "summer";
    step(
      "B3 save->reopen round-trips contacts + Mon hours + season",
      persisted,
      `phone=${gotPhone} email=${gotEmail} site=${gotSite} mon=${gotMonOpen}-${gotMonClose} season=${gotSeason} shot=${reopenPath}`,
    );
  } catch (e) {
    const p = await shot(page, "B-fail");
    step("B scenario threw", false, `${String(e).slice(0, 160)} shot=${p}`);
  } finally {
    if (errs.length) console.log("   JS errors (B):", JSON.stringify(errs));
    await ctx.close();
  }
}

// ---------------------------------------------------------------------------
// Scenario C — Per-place hero renders guest-side (6.C.2).
// Mint a fresh token for reservation 2, enter /r/<token>, open /p/<id>, assert
// the hero <img> actually loaded (naturalWidth > 0), not a broken image.
// ---------------------------------------------------------------------------
{
  const tag = "C";
  const errs = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // mobile twin: guest journey is phone-first
  const page = await ctx.newPage();
  instrument(page, tag, errs);
  try {
    // Mint a fresh guest token via the owner-gated BFF (Scenario A revoked the prior one).
    // Use a short-lived admin login in a separate page within this context.
    const adminPage = await ctx.newPage();
    await ownerLogin(adminPage);
    const token = await ownerToken(adminPage);
    const mint = await adminPage.evaluate(
      async ([rid, t]) => {
        const r = await fetch(`/v1/admin/reservations/${rid}/token`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        });
        const j = await r.json().catch(() => ({}));
        return { status: r.status, token: j.token };
      },
      [RES2, token],
    );
    await adminPage.close();
    if (mint.status !== 200 || !mint.token) {
      step("C0 mint fresh guest token via BFF", false, `status=${mint.status}`);
      throw new Error(`token mint failed status=${mint.status}`);
    }
    step("C0 mint fresh guest token via BFF", true, `status=200`);

    // Guest entry: /r/<token> exchanges + lands in the app.
    await page.goto(`${APP}/r/${mint.token}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.location.pathname === "/", { timeout: 20000 });
    step("C1 guest /r/<token> exchange -> app boots", true, page.url());

    // Open the published landmark's detail and confirm the hero image renders.
    await page.goto(`${APP}/p/${PLACE_HERO}`, { waitUntil: "domcontentloaded" });
    const heroImg = page.locator("img").first();
    await heroImg.waitFor({ timeout: 15000 });
    // Wait for the image to actually load (naturalWidth > 0 == decoded, not broken).
    await page
      .waitForFunction(
        () => {
          const img = document.querySelector("img");
          return img && img.complete && img.naturalWidth > 0;
        },
        { timeout: 20000 },
      )
      .catch(() => {});
    const heroState = await page.evaluate(() => {
      const img = document.querySelector("img");
      return {
        src: img?.src ?? null,
        naturalWidth: img?.naturalWidth ?? 0,
        complete: img?.complete ?? false,
      };
    });
    const heroPath = await shot(page, "C-guest-place-hero");
    step(
      "C2 guest place-detail hero image renders (naturalWidth>0)",
      heroState.naturalWidth > 0,
      `naturalWidth=${heroState.naturalWidth} src=${(heroState.src ?? "").slice(0, 64)}... shot=${heroPath}`,
    );
  } catch (e) {
    const p = await shot(page, "C-fail");
    step("C scenario threw", false, `${String(e).slice(0, 160)} shot=${p}`);
  } finally {
    if (errs.length) console.log("   JS errors (C):", JSON.stringify(errs));
    await ctx.close();
  }
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
console.log(`\n==== ${passed}/${results.length} steps passed ====`);
for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
