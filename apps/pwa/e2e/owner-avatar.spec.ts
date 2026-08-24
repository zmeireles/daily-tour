import { expect, test } from "@playwright/test";

/**
 * Owner avatar upload + display integration spec (LOCAL-only) — Plan-006 T-6.C.0.
 *
 * Exercises the full media foundation end-to-end through a real browser:
 * real OIDC login → pick a file in the backoffice profile → the shared
 * MediaUploader POSTs to the BFF upload proxy (which signs + PUTs to MinIO +
 * completes server-side) → the avatar `<img src="/v1/media/:id">` actually
 * renders (bytes served back through the BFF) → save → reload → still renders.
 *
 * Guards the integration bugs no mock catches: the split-horizon upload
 * (browser can't PUT to internal MinIO), the display proxy, the PNG MIME
 * allowlist, and the user_uuid sub_mode (owner_id must be a valid UUID).
 *
 * Requires the full local dev stack (Authentik :9000, vite dev :5173, bff,
 * media-svc, MinIO). Self-skips when AK_PW is unset or Authentik is down, so
 * CI is unaffected. Run: pnpm --filter @daily-tour/pwa test:e2e:owner
 */

const APP = "http://localhost:5173";
const AK_BASE = "http://localhost:9000";
const AUTHORITY = `${AK_BASE}/application/o/owner-app/`;
const CLIENT = "owner-app-public";
const AK_PW = process.env.AK_PW;

// 1x1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==",
  "base64",
);

function avatarLoaded(): boolean {
  const img = document.querySelector<HTMLImageElement>('img[alt="Owner avatar"]');
  return !!img && img.complete && img.naturalWidth > 0;
}

test.describe("owner avatar upload + display", () => {
  test.beforeEach(async () => {
    test.skip(
      !AK_PW,
      "AK_PW not set — owner media integration spec needs the local Authentik bootstrap password",
    );
    const up = await fetch(`${AK_BASE}/-/health/live/`)
      .then((r) => r.ok)
      .catch(() => false);
    test.skip(
      !up,
      "Authentik not reachable on :9000 — bring up the authentik overlay to run this spec",
    );
  });

  test("upload an avatar → renders → save → reload → still renders", async ({ page }) => {
    // Log in via real OIDC (Enter submits each shadow-DOM stage).
    await page.goto(`${APP}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/localhost:9000/, { timeout: 15_000 });
    const uid = page.locator('input[name="uidField"]');
    await uid.waitFor({ timeout: 15_000 });
    await uid.fill("akadmin");
    await uid.press("Enter");
    const pw = page.locator('input[name="password"]');
    await pw.waitFor({ timeout: 15_000 });
    await pw.fill(AK_PW!);
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
      ([a, c]) => !!localStorage.getItem(`oidc.user:${a}:${c}`),
      [AUTHORITY, CLIENT],
      { timeout: 20_000 },
    );

    // Profile → pick an avatar file (hidden input wired to the MediaUploader).
    await page.goto(`${APP}/admin/profile`, { waitUntil: "domcontentloaded" });
    await page.getByText("Owner Profile").waitFor({ timeout: 15_000 });
    await page.setInputFiles("#media-file-input", {
      name: "avatar.png",
      mimeType: "image/png",
      buffer: PNG,
    });

    // The avatar <img src="/v1/media/:id?w=200"> renders once the upload
    // completes. The width is part of the assertion on purpose: the avatar is a
    // 40 px thumbnail, so dropping `?w=` would silently go back to downloading
    // the full-size original and this spec would still pass.
    await page.getByRole("img", { name: "Owner avatar" }).waitFor({ timeout: 20_000 });
    await page.waitForFunction(avatarLoaded, { timeout: 20_000 });
    const src = await page.getByRole("img", { name: "Owner avatar" }).getAttribute("src");
    expect(src).toMatch(/^\/v1\/media\/[0-9a-f-]{36}\?w=200$/);

    // Persist, reload, and confirm the persisted avatar still loads.
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByText("Saved.").waitFor({ timeout: 15_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("Owner Profile").waitFor({ timeout: 15_000 });
    await page.waitForFunction(avatarLoaded, { timeout: 20_000 });
    const persisted = await page.getByRole("img", { name: "Owner avatar" }).getAttribute("src");
    expect(persisted).toBe(src);
  });
});
