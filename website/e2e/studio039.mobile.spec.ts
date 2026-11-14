/** Mission 039: the workstation on a phone — no horizontal overflow, every workspace reachable, run works. */
import { expect, test } from "@playwright/test";

test("039 mobile: workspaces are reachable, nothing overflows, a run completes", async ({ page }) => {
  await page.goto("/studio/");
  await expect(page.getByRole("heading", { name: "WESTFALL Studio", exact: true })).toBeVisible();
  for (const v of ["problem", "solver", "results", "analysis", "verification", "compare"]) {
    await page.getByTestId(`nav-${v}`).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow in ${v}`).toBeLessThanOrEqual(1);
  }
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal", { timeout: 60_000 });
  const box = await page.getByTestId("run").boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(32); // usable touch target
});
