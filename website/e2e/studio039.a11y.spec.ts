/**
 * Mission 039 accessibility audit: axe-core (WCAG 2.0/2.1 A and AA rules) on every Studio workspace, in both
 * themes, after a completed run. Any violation of impact "serious" or "critical" fails the test; the rest are logged.
 */
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const theme of ["dark", "light"] as const)
  test(`039 a11y (${theme}): no serious or critical axe violations in any workspace`, async ({ page }) => {
    await page.goto("/studio/");
    if (theme === "light") await page.getByRole("button", { name: "Switch to light mode" }).click();
    await page.getByTestId("run").click();
    await expect(page.getByTestId("job-state")).toHaveText("COMPLETED", { timeout: 60_000 });
    const report: string[] = [];
    for (const v of ["problem", "solver", "results", "analysis", "verification", "compare"]) {
      await page.getByTestId(`nav-${v}`).click();
      await page.waitForTimeout(200);
      const r = await new AxeBuilder({ page }).include("[data-testid=studio]").withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const x of r.violations) report.push(`${v}: [${x.impact}] ${x.id} (${x.nodes.length}) ${x.nodes.slice(0, 3).map((n) => `${n.target.join(" ")} :: ${(n.failureSummary ?? "").split("\n").slice(1, 2).join("")}`).join(" | ")}`);
    }
    console.log(report.join("\n") || "no violations");
    expect(report.filter((x) => /\[(serious|critical)\]/.test(x))).toEqual([]);
  });
