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
  return page.evaluate((label) => {
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
          return {
            label: b.innerText.trim().replace(/\s+/g, " "),
            visibleLabel: (visibleSpan?.textContent ?? "").trim(),
            left: +r.left.toFixed(1),
            right: +r.right.toFixed(1),
            width: +r.width.toFixed(1),
            height: +r.height.toFixed(1),
          };
        })
      : [];
    return {
      present: !!group,
      overflow: de.scrollWidth - de.clientWidth,
      viewport: window.innerWidth,
      buttons,
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
test.describe("authenticated guest home — the masthead never clips the switcher", () => {
  for (const width of [390, 768, 800, 834, 900, 960, 1024, 1280]) {
    test(`at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await stubApi(page);
      await page.goto("/r/e2e-token");
      // The redemption navigates to "/" on success. Waiting for the switcher
      // rather than a URL keeps this honest: a blank page would satisfy a URL
      // assertion and measure nothing.
      await page.waitForSelector('[role="group"][aria-label="Language switcher"]', {
        timeout: 15_000,
      });
      assertNoClipping(await measure(page, "Language switcher"), `home @${width}`);
    });
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
