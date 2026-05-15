import { expect, test } from "@playwright/test";

test("renders the greeting heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /hello, daily tour/i }),
  ).toBeVisible();
});
