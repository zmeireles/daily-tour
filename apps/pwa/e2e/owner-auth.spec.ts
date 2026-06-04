import { expect, test } from "@playwright/test";

/**
 * Owner-auth integration spec (LOCAL-only) — Plan-006 T-6.A.3.
 *
 * Exercises the REAL owner-login wiring that unit tests deliberately mock:
 * a genuine Authentik OIDC Authorization-Code + PKCE login, the BFF verifying
 * the resulting RS256 token via Authentik's JWKS, and the owner toggling a
 * place's guest-visibility through the live backoffice -> BFF -> catalog path.
 *
 * Guards the four integration bugs fixed in the owner-auth PR that no mock
 * could catch: the JWKS host, the requested OIDC scope (`groups`), the
 * Authentik URL scheme, and the public-vs-confidential client type.
 *
 * Requires the full local dev stack up — Authentik on :9000, vite dev on
 * :5173 (with the /v1 proxy + apps/pwa/.env.local), and the bff. It is
 * SKIPPED automatically when AK_PW is unset or Authentik is unreachable, so
 * CI (which has no Authentik) is unaffected.
 *
 * Run locally (uses its own config; reuses the running dev server):
 *   AK_PW=$(grep -E '^AUTHENTIK_BOOTSTRAP_PASSWORD=' ../../.env | cut -d= -f2-) \
 *     pnpm --filter @daily-tour/pwa test:e2e:owner
 */

const APP = "http://localhost:5173";
const AK_BASE = "http://localhost:9000";
const AUTHORITY = `${AK_BASE}/application/o/owner-app/`;
const CLIENT = "owner-app-public";
const AK_PW = process.env.AK_PW;

test.describe("owner backoffice OIDC login + visibility toggle", () => {
  test.beforeEach(async () => {
    test.skip(
      !AK_PW,
      "AK_PW not set — owner-auth integration spec needs the local Authentik bootstrap password",
    );
    const up = await fetch(`${AK_BASE}/-/health/live/`)
      .then((r) => r.ok)
      .catch(() => false);
    test.skip(
      !up,
      "Authentik not reachable on :9000 — bring up the authentik overlay to run this spec",
    );
  });

  test("real OIDC login → owner Hide/Show toggle persists to catalog and reverts", async ({
    page,
  }) => {
    type Guesthouse = { id: string; hidden_place_ids: string[] };
    type GhState = { status: number; gh: Guesthouse | null };

    // Read the owner token oidc-client stored, then call the owner-gated BFF.
    const ghState = (): Promise<GhState> =>
      page.evaluate<GhState, [string, string]>(
        async ([authority, client]) => {
          const raw = localStorage.getItem(`oidc.user:${authority}:${client}`);
          if (!raw) return { status: 0, gh: null };
          const token = (JSON.parse(raw) as { access_token: string }).access_token;
          const r = await fetch("/v1/admin/guesthouses", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const j = (await r.json()) as { data?: Guesthouse[] };
          return { status: r.status, gh: j.data?.[0] ?? null };
        },
        [AUTHORITY, CLIENT],
      );

    // 1. /admin → oidc-client redirects to the Authentik login flow.
    await page.goto(`${APP}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/localhost:9000/, { timeout: 15_000 });

    // 2. Identification + password stages. The submit button lives in nested
    //    shadow roots, so submit each stage with Enter.
    const uid = page.locator('input[name="uidField"]');
    await uid.waitFor({ timeout: 15_000 });
    await uid.fill("akadmin");
    await uid.press("Enter");

    const pw = page.locator('input[name="password"]');
    await pw.waitFor({ timeout: 15_000 });
    await pw.fill(AK_PW!);
    await pw.press("Enter");

    // 3. Click through a consent stage if one appears, then wait for the
    //    callback to store the token and route to /admin.
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
      { timeout: 20_000 },
    );
    await page.waitForURL((u) => u.pathname === "/admin", { timeout: 15_000 });

    // 4. Baseline: the owner-gated BFF call succeeds with the real token.
    const before = await ghState();
    expect(before.status, "owner GET /v1/admin/guesthouses").toBe(200);
    expect(before.gh).not.toBeNull();
    const baseline = before.gh!.hidden_place_ids;

    // 5. Hide the first currently-visible place via the real UI.
    await page.goto(`${APP}/admin/places`, { waitUntil: "domcontentloaded" });
    await page.locator("table tbody tr").first().waitFor({ timeout: 15_000 });
    const hideBtn = page
      .getByRole("button", { name: /Toggle guest visibility/ })
      .filter({ hasText: "Hide" })
      .first();
    await hideBtn.waitFor({ timeout: 10_000 });
    const row = page.locator("tr", { has: hideBtn });
    const placeName = (await row.locator("td").first().innerText()).trim();
    await hideBtn.click();

    // 6. UI flips to "Show" (Hidden badge) for that row.
    await expect(
      page
        .locator("tr", { hasText: placeName })
        .getByRole("button", { name: /Toggle guest visibility/ })
        .filter({ hasText: "Show" }),
    ).toBeVisible({ timeout: 10_000 });

    // 7. Catalog persisted exactly one new hidden id (owner UI → BFF → catalog).
    const afterHide = await ghState();
    const added = afterHide.gh!.hidden_place_ids.filter((id) => !baseline.includes(id));
    expect(added, `newly-hidden ids for "${placeName}"`).toHaveLength(1);
    const hiddenId = added[0];

    // 8. Toggle back and assert the catalog reverts.
    await page
      .locator("tr", { hasText: placeName })
      .getByRole("button", { name: /Toggle guest visibility/ })
      .filter({ hasText: "Show" })
      .first()
      .click();
    await expect(
      page
        .locator("tr", { hasText: placeName })
        .getByRole("button", { name: /Toggle guest visibility/ })
        .filter({ hasText: "Hide" }),
    ).toBeVisible({ timeout: 10_000 });
    const afterShow = await ghState();
    expect(afterShow.gh!.hidden_place_ids, "catalog reverted after Show").not.toContain(hiddenId);
  });
});
