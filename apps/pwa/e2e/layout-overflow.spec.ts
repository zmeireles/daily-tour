import { test, expect, type Page } from "@playwright/test";

// The layout guard the unit suite structurally cannot be (#406).
//
// WHY THIS FILE EXISTS. #382 and #405 were both "a shipped guest locale is
// unreachable because its button is off-screen". Both were fixed, and both
// fixes were covered only by jsdom tests — which load no CSS and do no layout,
// so they can assert accessible names and class strings and nothing else.
//
// The gap was measured, not assumed. Reviewing #400, a mutation that deletes
// the `sm:hidden` / `sr-only` pair — making BOTH labels render at every width,
// which overflows *worse* than the original bug — passed all seven of that
// PR's new tests. Three other mutations correctly went red. So the accessible-
// name axis was guarded and the layout axis was not guarded at all.
//
// These run against the built bundle via the config's `webServer` (preview),
// so they exercise real CSS at real viewport sizes.
//
// ⚠️ `scrollWidth === clientWidth` IS NOT SUFFICIENT and must never be the only
// assertion here. A negative `left` does not grow `scrollWidth`, so an element
// hanging off the LEFT edge reports a perfectly clean page overflow of 0. That
// is exactly how #405's landing clip ("English" at left: -7.1px) stayed
// invisible. Every check below also asserts per-element bounding boxes.

const b64url = (o: unknown) =>
  Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

// `decodeJwt` in src/lib/auth/exchange.ts is a deliberate no-verify decode —
// the BFF is the trust boundary — so an unsigned token is enough to put the
// app into its authenticated state without a backend.
function fakeJwt(locale = "pt-PT") {
  const claims = {
    sub: "e2e-guest",
    rid: "e2e-reservation",
    gh: "e2e-guesthouse",
    locale,
    jti: "e2e",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `${b64url({ alg: "none", typ: "JWT" })}.${b64url(claims)}.sig`;
}

// Layout does not need real data — it needs the right components mounted. Every
// other /v1 call gets an empty, well-formed answer so the shell renders instead
// of hanging or throwing.
async function stubApi(page: Page, locale = "pt-PT") {
  await page.route("**/v1/r/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ jwt: fakeJwt(locale), exp: Math.floor(Date.now() / 1000) + 3600 }),
    }),
  );
  await page.route("**/v1/**", (route) => {
    if (route.request().url().includes("/v1/r/")) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], items: [], results: [], nextCursor: null }),
    });
  });
}

/** Every locale button's box, plus the page's own horizontal overflow. */
async function measure(page: Page, groupLabel: "Language switcher" | "Language") {
  return page.evaluate(async (label) => {
    // ⚠️ FIRST, AND INSIDE measure() SO IT CANNOT BE FORGOTTEN. Wrap depth is a
    // pure function of text metrics, so measuring before the webfont applies
    // reports the FALLBACK font's narrower labels — systematically optimistic,
    // and worst in CI where the font cache is always cold.
    //
    // This was not hypothetical. #412 (fr@1024 wraps) reproduces on qual and on
    // a local build with a real session, in system Chrome and in Playwright's
    // Chromium alike — 60px every time. This file reported 44px and passed,
    // including with #414's 60px pin REMOVED, which is what exposed it: a
    // residual the file was written to pin could not make it fail. With this
    // await, that case reports the measured 60px and goes red.
    //
    // The line count below independently catches THAT case, so neither is
    // redundant: this await stops every assertion in the file from being taken
    // against narrower fallback-font metrics, and the line count closes the
    // separate blindness of the 44px min-height. Both were mutation-tested.
    await document.fonts.ready;
    const de = document.documentElement;
    const group = document.querySelector(`[role="group"][aria-label="${label}"]`);
    const buttons = group
      ? [...group.querySelectorAll("button")].map((b) => {
          const r = b.getBoundingClientRect();
          // The VISIBLE label only. `innerText` includes the sr-only span —
          // it reads "EN English" — so it cannot tell a compact label from a
          // full one. Tailwind's `sr-only` collapses the box to 1px, so the
          // painted span is the one with real width.
          const visibleSpan = [...b.querySelectorAll("span")].find(
            (s) => s.getBoundingClientRect().width > 1,
          );
          // Hit-test, not just position. Without it a "fix" that HIDES the
          // switcher below `lg` passes everything: every rect collapses to
          // 0x0 at the origin, so nothing is off-screen and no overflow
          // exists. Demonstrated on the sibling repro spec during review.
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          return {
            label: b.innerText.trim().replace(/\s+/g, " "),
            visibleLabel: (visibleSpan?.textContent ?? "").trim(),
            left: +r.left.toFixed(1),
            right: +r.right.toFixed(1),
            width: +r.width.toFixed(1),
            height: +r.height.toFixed(1),
            hittable:
              r.width > 0 && r.height > 0 && !!b.contains(document.elementFromPoint(cx, cy)),
          };
        })
      : [];
    // ⚠️ `header` is load-bearing. The mobile bottom tab bar carries the SAME
    // `nav[aria-label="Primary"]`, and the mobile app bar carries the same
    // role="group" switcher with hittable buttons — so an unscoped probe
    // passes happily on the phone tree. Demonstrated: flipping Home's
    // `engageAt` from "md" to "lg" hands every iPad width the mobile UI, and
    // this file stayed green while the masthead was never rendered at all.
    // The bottom tab bar is not inside a <header>.
    const headerNav = document.querySelector('header nav[aria-label="Primary"]');
    return {
      present: !!group,
      overflow: de.scrollWidth - de.clientWidth,
      viewport: window.innerWidth,
      buttons,
      masthead: !!headerNav,
      // Wrap depth. Horizontal overflow SATURATES: the row is packed
      // edge-to-edge, so added pressure is spent wrapping nav labels deeper
      // while overflow stays 0, until the nav hits min-content. Restoring the
      // profile stub costs French guests a three-line label on iPad portrait
      // and passes every overflow assertion. This is the axis that fails first.
      //
      // ⚠️ HEIGHT ALONE CANNOT COUNT LINES. The link carries `min-h-[44px]` and
      // two lines of 14px `text-sm` measure ~40px, so a TWO-line label sits
      // inside the floor and reports the same 44px as a one-line one. Only a
      // third line pushes past it. Measured on qual: 11 of 24 locale × width
      // cells already hold a two-line label, at every width from 768 to 1280 —
      // none of it visible on the height axis. So count lines too.
      navItems: headerNav
        ? [...headerNav.querySelectorAll("a")].map((a) => {
            // The LABEL, not the first span: the chat item's first span is the
            // avatar, which is `hidden` below `xl` and yields zero rects — a
            // measurement that reads as "one line". The avatar fallback is a
            // single character, so the label is the longest non-aria-hidden one.
            const span =
              [...a.querySelectorAll("span")]
                .filter((s) => !s.hasAttribute("aria-hidden"))
                .sort(
                  (x, y) =>
                    (y.textContent ?? "").trim().length - (x.textContent ?? "").trim().length,
                )[0] ?? a;
            // Count over the TEXT, not the element. The label span is a flex
            // item and therefore block-level, so `span.getClientRects()` returns
            // exactly one rect however many lines it holds — that version
            // reported "one line" for a label measured at three. A Range over
            // its contents yields one rect per line box.
            const range = document.createRange();
            range.selectNodeContents(span);
            const lh = parseFloat(getComputedStyle(span).lineHeight);
            return {
              text: (a as HTMLElement).innerText.replace(/\s+/g, " ").trim().slice(0, 28),
              height: +a.getBoundingClientRect().height.toFixed(0),
              lines: Math.max(
                range.getClientRects().length,
                // Independent cross-check, so a Range quirk cannot silently
                // under-report: the box height over one line's height.
                Number.isFinite(lh) ? Math.round(span.getBoundingClientRect().height / lh) : 0,
              ),
            };
          })
        : [],
    };
  }, groupLabel);
}

function assertNoClipping(
  m: Awaited<ReturnType<typeof measure>>,
  where: string,
  expectedButtons = 4,
) {
  // Control first: if the switcher is not on the page, everything below would
  // pass vacuously — a blank or wrong page has no overflow and no clipped
  // buttons. Fail loudly instead.
  expect(m.present, `${where}: locale switcher must be present, or nothing here is measured`).toBe(
    true,
  );
  expect(m.buttons.length, `${where}: expected ${expectedButtons} locale buttons`).toBe(
    expectedButtons,
  );

  expect(
    m.overflow,
    `${where}: page overflows horizontally by ${m.overflow}px`,
  ).toBeLessThanOrEqual(1);

  const clipped = m.buttons.filter((b) => b.left < -0.5 || b.right > m.viewport + 0.5);
  expect(
    clipped,
    `${where}: locale button(s) outside the viewport — a guest cannot tap their own language`,
  ).toEqual([]);

  // "Reachable" means tappable, not merely un-clipped. A zero-sized or
  // covered button satisfies every assertion above.
  const unreachable = m.buttons.filter((b) => !b.hittable || b.width < 8);
  expect(
    unreachable.map((b) => b.label || "(blank)"),
    `${where}: locale button(s) present but not tappable`,
  ).toEqual([]);
}

// A one- or two-line nav item is 44px (the `min-h-[44px]` floor absorbs the
// second line); a three-line one is 60px. #412's fr@1024 residual is now fixed
// in copy, so there is no height exception left to pin.
const MAX_NAV_ITEM_HEIGHT = 44;

// The line ceiling is 2, and that number is a RECORD OF THE CURRENT STATE rather
// than a target. Measured on qual across 4 locales × 6 widths: 11 of 24 cells
// hold a two-line label, in every locale, from 768 up to and including 1280 —
// because the nav is the only shrinking flex child and it is squeezed to 321.7px
// at 1024. Getting every label onto one line means giving the nav real width
// back, which is a design change across the whole desktop band (#417), not a
// copy fix. Until that is decided, 2 is what ships — so assert 2 and let a THIRD
// line fail, which is exactly the regression #412 was.
const MAX_NAV_LABEL_LINES = 2;

function assertWrapDepth(
  m: Awaited<ReturnType<typeof measure>>,
  width: number,
  locale: string,
): void {
  const tooDeep = m.navItems.filter((i) => i.lines > MAX_NAV_LABEL_LINES);
  expect(
    tooDeep,
    `${locale} @${width}: nav label on more than ${MAX_NAV_LABEL_LINES} lines. The 44px ` +
      `min-height hides a second line, so height alone cannot see this — and a third line is ` +
      `what #412 was.`,
  ).toEqual([]);

  const tooTall = m.navItems.filter((i) => i.height > MAX_NAV_ITEM_HEIGHT);
  expect(
    tooTall,
    `${locale} @${width}: nav label wrapped deeper than ${MAX_NAV_ITEM_HEIGHT}px. Overflow ` +
      `saturates — it stays 0 while the row absorbs pressure by wrapping, so this is the axis ` +
      `that fails first.`,
  ).toEqual([]);
}

// The public landing. Unauthenticated, so this half needs no session at all.
// 320 is where #405's secondary defect lived, and it is invisible to a
// page-overflow check.
test.describe("public landing — the locale switcher never clips", () => {
  for (const width of [320, 360, 390, 414, 768]) {
    test(`at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForSelector('[role="group"][aria-label="Language"]', { timeout: 15_000 });
      assertNoClipping(await measure(page, "Language"), `landing @${width}`);
    });
  }
});

// The authenticated guest home. 768–1023 is the range where the desktop
// masthead engages (`ResponsiveScreen` engageAt="md") but did not fit, putting
// Français and then Español off-screen entirely — iPad portrait is 768–834.
// ⚠️ LOCALE IS A DIMENSION, not a detail. The #405 compaction budget was
// computed against pt-PT; French nav labels are wider (item widths 104/87/124
// vs 102/58/119), so the first fix measured clean in Portuguese and still
// overflowed 20px at 768 in French — and 49px at 1024, which was pre-existing.
// A guard that tests one locale would have certified both.
test.describe("authenticated guest home — the masthead never clips the switcher", () => {
  // 768 is where the desktop masthead engages; below it the app renders the
  // mobile tree, which has no masthead at all and is covered separately below.
  for (const width of [768, 800, 834, 900, 960, 1024, 1100, 1280]) {
    for (const locale of ["en", "pt-PT", "fr", "es"]) {
      test(`at ${width}px in ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await stubApi(page, locale);
        // `?lng=` is first in the detector order, so it wins outright. The
        // redemption navigates to "/" on success; waiting for the switcher
        // rather than a URL keeps this honest, because a blank page would
        // satisfy a URL assertion and measure nothing.
        await page.goto(`/r/e2e-token?lng=${locale}`);
        // The masthead specifically, not just "some primary nav" — see the
        // note in measure(). This is what makes an engageAt regression fail
        // instead of silently measuring the phone UI.
        await page.waitForSelector('header nav[aria-label="Primary"]', { timeout: 15_000 });
        await page.waitForSelector('[role="group"][aria-label="Language switcher"]', {
          timeout: 15_000,
        });
        const m = await measure(page, "Language switcher");
        expect(m.masthead, `home @${width} [${locale}]: desktop masthead not rendered`).toBe(true);
        assertNoClipping(m, `home @${width} [${locale}]`);
        assertWrapDepth(m, width, locale);
      });
    }
  }
});

// The authenticated home on the MOBILE tree, which has no masthead — the
// switcher rides in the app bar instead. Kept as its own group because the
// masthead assertions cannot apply here, and folding the two together is what
// let an `engageAt` regression read as a pass: iPad widths silently rendering
// this tree satisfied every check written for the other one.
test.describe("authenticated guest home (mobile tree) — the switcher never clips", () => {
  for (const width of [320, 360, 390, 414]) {
    for (const locale of ["en", "pt-PT", "fr", "es"]) {
      test(`at ${width}px in ${locale}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await stubApi(page, locale);
        await page.goto(`/r/e2e-token?lng=${locale}`);
        await page.waitForSelector('[role="group"][aria-label="Language switcher"]', {
          timeout: 15_000,
        });
        const m = await measure(page, "Language switcher");
        // The inverse control of the masthead group: below `md` there must be
        // no masthead, so a regression in the other direction is caught too.
        expect(m.masthead, `mobile @${width}: masthead should NOT render below md`).toBe(false);
        assertNoClipping(m, `mobile @${width} [${locale}]`);
      });
    }
  }
});

// Guards the specific regression that #405 was: the switcher serves BOTH the
// mobile app bar and the desktop masthead, so a breakpoint that is right for
// one can be wrong for the other. Below `lg` the visible label must be the
// short code — full words do not fit the masthead until 1024.
test.describe("the compact label is what actually renders below lg", () => {
  for (const [width, expectShort] of [
    [834, true],
    [1280, false],
  ] as const) {
    test(`at ${width}px the visible label is ${expectShort ? "a code" : "a full word"}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await stubApi(page);
      await page.goto("/r/e2e-token");
      await page.waitForSelector('[role="group"][aria-label="Language switcher"]', {
        timeout: 15_000,
      });

      // Measured from the painted span, not `innerText` — which includes the
      // sr-only half and reads "EN English" at every width, so it could never
      // have distinguished the two states.
      const m = await measure(page, "Language switcher");
      const visible = m.buttons.map((b) => b.visibleLabel);
      if (expectShort) {
        expect(visible, `@${width} expected ISO codes`).toEqual(["EN", "PT", "FR", "ES"]);
      } else {
        expect(visible.join(" "), `@${width} expected full words`).toMatch(/Portugu/);
      }
    });
  }
});
