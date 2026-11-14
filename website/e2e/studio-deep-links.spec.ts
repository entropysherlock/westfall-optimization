/** Real-browser smoke test for shareable, whitelisted example links on the static Studio. */
import { expect, test } from "@playwright/test";

test("a ranking pilot link loads the bundled Kemeny instance and solves it exactly", async ({ page }) => {
  await page.goto("/studio/?example=kemeny");
  await expect(page.getByTestId("validation-ok")).toContainText("6 items");
  await expect(page.getByTestId("data-input")).toHaveValue(/Ames,Baker,Chen,Diaz,Evans,Ford/);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText("COMPLETED", { timeout: 60_000 });
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal");
});

test("unknown example parameters do not replace the safe default model", async ({ page }) => {
  await page.goto("/studio/?example=not-a-sample");
  await expect(page.getByTestId("validation-ok")).toContainText("7 items");
  await expect(page.getByTestId("data-input")).toHaveValue(/J1,J2,J3,J4,J5,J6,J7/);
});
