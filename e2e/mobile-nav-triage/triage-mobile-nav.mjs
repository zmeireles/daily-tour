// Triage: at 390×844, does tapping a place card on /a/eat navigate to /p/<id>?
//
// Context: UAT #30 saw desktop PASS / mobile FAIL (URL stayed on /a/eat).
// Structural facts from the source:
//   * <lg the route renders DiscoverMap + DiscoverSheet (draggable motion.div,
//     drag="y", snap peek=45% / expanded=85%).
//   * PlaceCard is NEVER an <a href> — PressableShell renders a div with
//     onClick + role="button". Same on desktop (discover-list-panel).
//   * The #30 harness looked for a[href*="/p/"] (0 matches on BOTH layouts) and
//     fell back to getByText(name).first().click() — the <h3> inside the card.
//
// So: replay several interaction methods against the ribbon card and report
// which ones navigate. Read-only: no logins, no writes, guest session only.
import { readdirSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
if (!pwPkg) throw new Error("playwright-core not found under node_modules/.pnpm");
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const GUEST_TOKEN = process.env.RTOKEN;
const OUT = resolve(repoRoot, "temp/mobile-nav-triage");
mkdirSync(OUT, { recursive: true });
const LOG = resolve(OUT, "log.txt");
writeFileSync(LOG, `# mobile-nav triage ${new Date().toISOString()}\n`);

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  lg: { width: 1024, height: 768 },
  desktop: { width: 1440, height: 900 },
};

const results = [];
const jsErrors = [];
let stepIdx = 0;

function log(s) {
  console.log(s);
  appendFileSync(LOG, `${s}\n`);
}
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  log(
    `${ok === true ? "✓" : ok === false ? "✗ FAIL" : "· " + ok} ${name}${detail ? ` — ${detail}` : ""}`,
  );
}
async function shot(page, name) {
  await page.screenshot({ path: resolve(OUT, `${name}.png`) }).catch(() => {});
}

async function newPage(browser, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: vp, locale: "pt-PT", ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => jsErrors.push(`[s${stepIdx}] pageerror: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error") jsErrors.push(`[s${stepIdx}] console: ${m.text().slice(0, 200)}`);
  });
  return { ctx, page };
}

// Guest redeem: session lives in an in-memory store, so after this every hop
// must be an in-app click — a hard goto drops the JWT.
async function redeem(page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`${BASE}/r/${GUEST_TOKEN}`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(1500);
      const url = page.url();
      if (!/reason=expired/.test(url) && !/\/r\//.test(url)) {
        const ready = await page
          .locator('a[href^="/a/"]')
          .first()
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false);
        if (ready) return true;
      }
    } catch {
      /* retry */
    }
    await page.waitForTimeout(1500);
  }
  return false;
}

// Home → /a/eat by clicking, as a guest would.
async function gotoEat(page) {
  const link = page.locator('a[href*="/a/eat"]').first();
  if (!(await link.count())) return false;
  await link.click();
  await page.waitForURL(/\/a\/eat/, { timeout: 20000 });
  // discover query + map + sheet mount
  await page
    .waitForSelector("[data-place-id], [role='button']", { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(3500);
  return /\/a\/eat/.test(page.url());
}

// Instrument the page so we can tell "no event reached the DOM" from
// "event reached the card and nothing happened".
async function instrument(page) {
  await page.evaluate(() => {
    window.__ev = [];
    const rec = (type) => (e) => {
      const t = e.target;
      const card = t.closest?.("[data-place-id]");
      window.__ev.push(
        `${type}@${t.tagName}.${(t.className || "").toString().slice(0, 28)}${card ? " [in-card]" : " [outside-card]"}${e.defaultPrevented ? " prevented" : ""}`,
      );
    };
    for (const type of ["pointerdown", "pointerup", "click", "touchstart", "touchend"]) {
      document.addEventListener(type, rec(type), true); // capture
    }
    document.addEventListener(
      "click",
      (e) => window.__ev.push(`bubbled-click@${e.target.tagName}`),
      false,
    );
  });
}
const evDump = (page) =>
  page.evaluate(() => (window.__ev || []).join(" | ").slice(0, 900)).catch(() => "n/a");

// ── DOM anatomy of the first ribbon card ───────────────────────────────────
async function anatomy(page) {
  return page.evaluate(() => {
    const card = document.querySelector("[data-place-id]");
    if (!card) return { found: false };
    const btn = card.querySelector('[role="button"]') ?? card;
    const h3 = card.querySelector("h3");
    const img = card.querySelector("img, [data-testid='place-card-hero-placeholder']");
    const describe = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const cx = Math.round(r.left + r.width / 2);
      const cy = Math.round(r.top + r.height / 2);
      const top = document.elementFromPoint(cx, cy);
      return {
        tag: el.tagName,
        role: el.getAttribute("role"),
        href: el.getAttribute("href"),
        box: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          w: Math.round(r.width),
          h: Math.round(r.height),
        },
        center: { cx, cy },
        pointerEvents: cs.pointerEvents,
        touchAction: cs.touchAction,
        visibility: `${cs.visibility}/${cs.display}/op${cs.opacity}`,
        inViewport: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
        topAtCenter: top ? `${top.tagName}.${(top.className || "").toString().slice(0, 40)}` : null,
        topIsSelfOrChild: top ? el.contains(top) || el === top : false,
      };
    };
    // What does the sheet look like, and does anything overlay the card?
    const sheet = card.closest(".absolute") ?? card.parentElement?.parentElement;
    return {
      found: true,
      placeId: card.getAttribute("data-place-id"),
      name: h3?.textContent ?? null,
      cardOuter: card.outerHTML.slice(0, 400),
      pressable: describe(btn),
      h3: describe(h3),
      hero: describe(img),
      anchorsToPlace: document.querySelectorAll('a[href*="/p/"]').length,
      roleButtons: document.querySelectorAll('[role="button"]').length,
      sheetStyle: sheet
        ? getComputedStyle(sheet).touchAction +
          " / " +
          (sheet.className || "").toString().slice(0, 60)
        : null,
      innerH: innerHeight,
    };
  });
}

// ── One probe = fresh context, one interaction method ──────────────────────
async function probe(browser, { label, vp, method, expand = false }) {
  stepIdx += 1;
  const { ctx, page } = await newPage(browser, vp, { hasTouch: true, isMobile: vp.width < 768 });
  let detail = "";
  let ok = false;
  try {
    if (!(await redeem(page))) throw new Error("redeem bounced");
    if (!(await gotoEat(page))) throw new Error("could not reach /a/eat");

    if (expand) {
      // Open the sheet to its full list ("expanded" snap) via the handle button.
      const handle = page.getByRole("button", { name: /expandir|expand|abrir/i }).first();
      if (await handle.count()) await handle.click();
      else
        await page
          .locator("button.cursor-grab")
          .first()
          .click()
          .catch(() => {});
      await page.waitForTimeout(1200);
    }

    const anat = await anatomy(page);
    if (!anat.found) throw new Error("no [data-place-id] card in the DOM");
    await instrument(page);
    await shot(page, `${label}-before`);

    const card = page.locator("[data-place-id]").first();
    const pressable = card.locator('[role="button"]').first();
    const h3 = card.locator("h3").first();
    const before = page.url();
    let threw = "";

    try {
      if (method === "click-pressable") await pressable.click({ timeout: 8000 });
      else if (method === "tap-pressable") {
        const b = await pressable.boundingBox();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      } else if (method === "click-h3") await h3.click({ timeout: 8000 });
      else if (method === "tap-h3") {
        const b = await h3.boundingBox();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      } else if (method === "click-hero") {
        const hero = card.locator("img, [data-testid='place-card-hero-placeholder']").first();
        await hero.click({ timeout: 8000 });
      } else if (method === "keyboard-enter") {
        await pressable.focus();
        await page.keyboard.press("Enter");
      } else if (method === "getByText-first") {
        // Exact replay of the #30 harness fallback.
        const nm = anat.name;
        await page.getByText(nm).first().click({ timeout: 8000 });
      }
    } catch (e) {
      threw = `THREW(${String(e.message).split("\n")[0].slice(0, 120)})`;
    }

    await page.waitForURL(/\/p\//, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = page.url();
    ok = /\/p\//.test(after);
    const evs = await evDump(page);
    await shot(page, `${label}-after`);
    detail =
      `vp=${vp.width}x${vp.height} method=${method}${expand ? " expanded" : " peek"} ` +
      `url ${before.replace(BASE, "")} → ${after.replace(BASE, "")} ${threw} ` +
      `| pressable=${anat.pressable?.tag}[role=${anat.pressable?.role}] topAtCenter=${anat.pressable?.topAtCenter} ownTop=${anat.pressable?.topIsSelfOrChild} ` +
      `| h3.topAtCenter=${anat.h3?.topAtCenter} h3.ownTop=${anat.h3?.topIsSelfOrChild} inVp=${anat.h3?.inViewport} ` +
      `| anchors=${anat.anchorsToPlace} | ev: ${evs}`;
    if (!results.__anatDumped) {
      writeFileSync(resolve(OUT, `anatomy-${label}.json`), JSON.stringify(anat, null, 2));
    }
    writeFileSync(resolve(OUT, `anatomy-${label}.json`), JSON.stringify(anat, null, 2));
  } catch (e) {
    detail = `threw: ${String(e.message).slice(0, 200)}`;
    await shot(page, `${label}-ERROR`);
  } finally {
    await ctx.close();
  }
  step(`${label}`, ok, detail);
  return ok;
}

// ═══════════════════════════════════════════════════════════════════════════
const browser = await chromium.launch({ executablePath: CHROME });
try {
  // Mobile 390×844 — the viewport under suspicion.
  await probe(browser, {
    label: "M1-mobile-click-pressable",
    vp: VIEWPORTS.mobile,
    method: "click-pressable",
  });
  await probe(browser, {
    label: "M2-mobile-tap-pressable",
    vp: VIEWPORTS.mobile,
    method: "tap-pressable",
  });
  await probe(browser, { label: "M3-mobile-click-h3", vp: VIEWPORTS.mobile, method: "click-h3" });
  await probe(browser, { label: "M4-mobile-tap-h3", vp: VIEWPORTS.mobile, method: "tap-h3" });
  await probe(browser, {
    label: "M5-mobile-click-hero",
    vp: VIEWPORTS.mobile,
    method: "click-hero",
  });
  await probe(browser, {
    label: "M6-mobile-keyboard-enter",
    vp: VIEWPORTS.mobile,
    method: "keyboard-enter",
  });
  await probe(browser, {
    label: "M7-mobile-getByText-first (replay of #30)",
    vp: VIEWPORTS.mobile,
    method: "getByText-first",
  });
  await probe(browser, {
    label: "M8-mobile-expanded-list-click",
    vp: VIEWPORTS.mobile,
    method: "click-pressable",
    expand: true,
  });
  await probe(browser, {
    label: "M9-mobile-expanded-list-tap",
    vp: VIEWPORTS.mobile,
    method: "tap-pressable",
    expand: true,
  });
  // Control: same code path one breakpoint up + on desktop.
  await probe(browser, {
    label: "C1-tablet-click-pressable",
    vp: VIEWPORTS.tablet,
    method: "click-pressable",
  });
  await probe(browser, {
    label: "C2-desktop-click-pressable",
    vp: VIEWPORTS.desktop,
    method: "click-pressable",
  });
  await probe(browser, {
    label: "C3-desktop-getByText-first",
    vp: VIEWPORTS.desktop,
    method: "getByText-first",
  });
} finally {
  await browser.close();
}

log("\n──────── SUMMARY ────────");
const pass = results.filter((r) => r.ok === true).length;
log(`${pass}/${results.length} probes navigated to /p/<id>`);
for (const r of results) log(`${r.ok === true ? "NAV  " : "NO-NAV"} ${r.name}`);
if (jsErrors.length) {
  log(`\nJS errors (${jsErrors.length}):`);
  for (const e of [...new Set(jsErrors)].slice(0, 25)) log(`  ${e}`);
}
