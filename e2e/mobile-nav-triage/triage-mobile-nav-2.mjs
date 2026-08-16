// Triage part 2 — confirm the overlay is the sole cause, and cover the
// expanded-sheet list (which has no [data-place-id], so run 1 skipped it).
//   P1: consent banner DISMISSED → is the card <h3> topmost + clickable?
//   P2: consent still up → measure exactly what the banner covers.
//   P3/P4: sheet dragged to "expanded" → click / tap a list card.
// Read-only: consent choice is localStorage in a throwaway context; no writes.
import { readdirSync, mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const pnpmDir = resolve(repoRoot, "node_modules/.pnpm");
const pwPkg = readdirSync(pnpmDir).find((d) => d.startsWith("playwright-core@"));
const { chromium } = (
  await import(`file://${resolve(pnpmDir, pwPkg, "node_modules/playwright-core/index.js")}`)
).default;

const CHROME = process.env.CHROME_BIN ?? "/usr/bin/google-chrome-stable";
const BASE = process.env.BASE_URL ?? "https://qual.stay.portugalodyssey.pt";
const GUEST_TOKEN = process.env.RTOKEN;
const OUT = resolve(repoRoot, "temp/mobile-nav-triage");
mkdirSync(OUT, { recursive: true });
const LOG = resolve(OUT, "log2.txt");
writeFileSync(LOG, `# mobile-nav triage part 2 ${new Date().toISOString()}\n`);
const MOBILE = { width: 390, height: 844 };

const results = [];
function log(s) {
  console.log(s);
  appendFileSync(LOG, `${s}\n`);
}
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  log(`${ok === true ? "✓" : "✗ FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}
const shot = (page, n) => page.screenshot({ path: resolve(OUT, `${n}.png`) }).catch(() => {});

async function guestOnEat(browser) {
  const ctx = await browser.newContext({
    viewport: MOBILE,
    locale: "pt-PT",
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  for (let i = 0; i < 3; i++) {
    await page
      .goto(`${BASE}/r/${GUEST_TOKEN}`, { waitUntil: "domcontentloaded", timeout: 45000 })
      .catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1500);
    if (!/\/r\/|reason=expired/.test(page.url())) break;
  }
  await page.locator('a[href*="/a/eat"]').first().click();
  await page.waitForURL(/\/a\/eat/, { timeout: 20000 });
  await page.waitForTimeout(3500);
  return { ctx, page };
}

const probeTop = (page) =>
  page.evaluate(() => {
    const card = document.querySelector("[data-place-id]");
    const h3 = card?.querySelector("h3");
    if (!h3) return { ok: false };
    const r = h3.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(cx, cy);
    const banner = document.querySelector('[role="region"][aria-label]');
    const br = banner?.getBoundingClientRect();
    return {
      ok: true,
      name: h3.textContent,
      h3Box: { y: Math.round(r.y), h: Math.round(r.height) },
      top: top ? `${top.tagName}.${(top.className || "").toString().slice(0, 40)}` : null,
      topIsCard: top ? !!top.closest("[data-place-id]") : false,
      bannerPresent: !!banner,
      bannerLabel: banner?.getAttribute("aria-label") ?? null,
      bannerBox: br
        ? { y: Math.round(br.y), h: Math.round(br.height), z: getComputedStyle(banner).zIndex }
        : null,
      innerH: innerHeight,
    };
  });

const browser = await chromium.launch({ executablePath: CHROME });
try {
  // ── P1/P2 — the banner, before and after dismissal ────────────────────────
  {
    const { ctx, page } = await guestOnEat(browser);
    const before = await probeTop(page);
    await shot(page, "P2-banner-up");
    step(
      "P2 consent banner overlays the peek-sheet card title (measurement)",
      before.top !== null,
      `banner=${before.bannerLabel} z=${before.bannerBox?.z} bannerTopY=${before.bannerBox?.y} h=${before.bannerBox?.h} ` +
        `| cardTitle y=${before.h3Box?.y}(h${before.h3Box?.h}) topAtTitle=${before.top} titleReachable=${before.topIsCard} vpH=${before.innerH}`,
    );

    // Dismiss consent the way a guest would (Decline = no analytics).
    const decline = page.getByRole("button", { name: /recusar|decline/i }).first();
    await decline.click({ timeout: 10000 });
    await page.waitForTimeout(1200);
    const after = await probeTop(page);
    await shot(page, "P1-banner-dismissed");

    const url0 = page.url();
    let threw = "";
    try {
      await page.locator("[data-place-id] h3").first().click({ timeout: 8000 });
    } catch (e) {
      threw = `THREW(${String(e.message).split("\n")[0].slice(0, 90)})`;
    }
    await page.waitForURL(/\/p\//, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const navigated = /\/p\//.test(page.url());
    await shot(page, "P1-after-title-click");
    step(
      "P1 with consent dismissed, tapping the card TITLE navigates (mobile 390×844)",
      navigated,
      `bannerStillPresent=${after.bannerPresent} topAtTitle=${after.top} titleReachable=${after.topIsCard} ` +
        `url ${url0.replace(BASE, "")} → ${page.url().replace(BASE, "")} ${threw}`,
    );
    await ctx.close();
  }

  // ── P3/P4 — expanded sheet (full list) ────────────────────────────────────
  for (const method of ["click", "tap"]) {
    const { ctx, page } = await guestOnEat(browser);
    let detail = "";
    let ok = false;
    try {
      await page
        .getByRole("button", { name: /recusar|decline/i })
        .first()
        .click({ timeout: 8000 })
        .catch(() => {});
      await page.waitForTimeout(600);
      // Expand the sheet via its handle (accessible toggle).
      const handle = page.locator("button.cursor-grab").first();
      await handle.click({ timeout: 8000 });
      await page.waitForTimeout(1500);
      await shot(page, `P3-expanded-${method}`);
      const listed = await page.evaluate(() => {
        // Expanded list cards: role=button wrappers that contain an <h3>.
        const btns = [...document.querySelectorAll('[role="button"]')].filter((b) =>
          b.querySelector("h3"),
        );
        const first = btns[0];
        const r = first?.getBoundingClientRect();
        return {
          count: btns.length,
          hasRibbon: !!document.querySelector("[data-place-id]"),
          name: first?.querySelector("h3")?.textContent ?? null,
          box: r
            ? {
                x: Math.round(r.x),
                y: Math.round(r.y),
                w: Math.round(r.width),
                h: Math.round(r.height),
              }
            : null,
        };
      });
      const card = page.locator('[role="button"]:has(h3)').first();
      await card.scrollIntoViewIfNeeded().catch(() => {});
      const url0 = page.url();
      let threw = "";
      try {
        if (method === "click") await card.click({ timeout: 8000 });
        else {
          const b = await card.boundingBox();
          await page.touchscreen.tap(b.x + b.width / 2, b.y + Math.min(b.height / 2, 60));
        }
      } catch (e) {
        threw = `THREW(${String(e.message).split("\n")[0].slice(0, 90)})`;
      }
      await page.waitForURL(/\/p\//, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1000);
      ok = /\/p\//.test(page.url());
      await shot(page, `P3-expanded-${method}-after`);
      detail = `listCards=${listed.count} ribbonGone=${!listed.hasRibbon} first="${listed.name}" box=${JSON.stringify(listed.box)} url ${url0.replace(BASE, "")} → ${page.url().replace(BASE, "")} ${threw}`;
    } catch (e) {
      detail = `threw: ${String(e.message).slice(0, 180)}`;
      await shot(page, `P3-expanded-${method}-ERROR`);
    } finally {
      await ctx.close();
    }
    step(`P3 expanded sheet list card — ${method} navigates (mobile)`, ok, detail);
  }
} finally {
  await browser.close();
}

log("\n──────── SUMMARY ────────");
log(`${results.filter((r) => r.ok === true).length}/${results.length} passed`);
