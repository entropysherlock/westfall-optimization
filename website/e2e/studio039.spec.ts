/**
 * Mission 039 end-to-end tests for the workstation: workspace navigation preserves data, live telemetry,
 * matrix explorer readout against exact values, comparison lab, verification lab (incl. tamper test and
 * file check), local sessions, theme, keyboard access, and mobile layout.
 */
import { expect, test, type Page } from "@playwright/test";
import fs from "fs";

const go = (page: Page, view: string) => page.getByTestId(`nav-${view}`).click();
async function open(page: Page) {
  await page.goto("/studio/");
  await expect(page.getByRole("heading", { name: "WESTFALL Studio", exact: true })).toBeVisible();
}
async function generate(page: Page, kind: string, n: number, seed = 1) {
  await go(page, "problem");
  await page.selectOption('select[aria-label="Generator"]', kind);
  await page.fill('input[aria-label="Number of items"]', String(n));
  await page.fill('input[aria-label="Generator seed"]', String(seed));
  await page.getByTestId("generate").click();
  await expect(page.getByTestId("validation-ok")).toContainText(`${n} items`);
}

test("039: switching workspaces preserves edited data and settings", async ({ page }) => {
  await open(page);
  await page.getByTestId("data-input").fill("0,2,-1\n-2,0,3\n1,-3,0\n");
  await page.selectOption("#interp", "skew");
  await go(page, "solver");
  await page.getByTestId("mode-advanced").click();
  await page.fill("#seed", "77");
  await go(page, "analysis");
  await go(page, "problem");
  await expect(page.getByTestId("data-input")).toHaveValue("0,2,-1\n-2,0,3\n1,-3,0\n");
  await go(page, "solver");
  await expect(page.locator("#seed")).toHaveValue("77");
});

test("039: ATLAS streams measured telemetry and the bracket closes at the proved optimum", async ({ page }) => {
  await open(page);
  await generate(page, "random-int", 30, 3);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("run-monitor")).toBeVisible();
  await expect(page.getByTestId("job-state")).toHaveText("COMPLETED", { timeout: 90_000 });
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal");
  await expect(page.getByTestId("gap")).toHaveText("0 (proved)");
  // the UI stayed responsive: navigation works right after the run
  await go(page, "analysis");
  await expect(page.getByTestId("matrix-explorer")).toBeVisible();
});

test("039: cancelling a running exact search is immediate and leaves no result", async ({ page }) => {
  await open(page);
  await generate(page, "random-int", 40, 2);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText("RUNNING");
  await page.waitForTimeout(800);
  const t0 = Date.now();
  await page.getByTestId("cancel").click();
  await expect(page.getByTestId("job-state")).toHaveText("CANCELLED");
  expect(Date.now() - t0).toBeLessThan(1500);
  await go(page, "results");
  await expect(page.getByTestId("results")).toHaveCount(0);
});

test("039: matrix explorer reads exact entries (keyboard) and the side-by-side view renders", async ({ page }) => {
  await open(page);
  await page.getByTestId("data-input").fill("A,B,C\n0,1/2,-3\n-1/2,0,7/3\n3,-7/3,0\n");
  await page.selectOption("#format", "matrix");
  await page.selectOption("#interp", "skew");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText("COMPLETED");
  await go(page, "analysis");
  await page.getByTestId("matrix-explorer-canvas").focus();
  await page.keyboard.press("ArrowRight"); // cursor (0,1)→(0,2)
  const readout = page.getByTestId("matrix-explorer-readout");
  await expect(readout).toContainText(/a\(.+, .+\) = /);
  const txt = await readout.innerText();
  // every exact value shown must be one of the matrix's rationals
  expect(txt).toMatch(/= (1\/2|-1\/2|-3|3|7\/3|-7\/3)/);
  await page.getByRole("radio", { name: "Side by side" }).click();
  await expect(page.getByTestId("matrix-initial-canvas")).toBeVisible();
  await expect(page.getByTestId("matrix-optimized-canvas")).toBeVisible();
  await page.getByRole("tab", { name: "Ordering changes" }).click();
  await expect(page.getByTestId("kendall")).toBeVisible();
});

test("039: comparison lab runs several solvers on the same instance and exports a report", async ({ page }) => {
  await open(page);
  await generate(page, "ties", 12, 4);
  await go(page, "compare");
  await page.getByTestId("run-comparison").click();
  await expect(page.getByTestId("comparability")).toBeVisible({ timeout: 120_000 });
  const rows = page.getByTestId("comparison-table").locator("tbody tr");
  await expect(rows).toHaveCount(4); // subset DP, exclusion, ATLAS, heuristic (AutoCut is n ≤ 9)
  const proved = page.getByTestId("comparison-table").getByText("Proven optimal", { exact: true });
  await expect(proved).toHaveCount(3);
  await expect(page.getByTestId("comparability")).toContainText("not a benchmark study");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-comparison").click()]);
  const md = fs.readFileSync((await dl.path())!, "utf8");
  expect(md).toContain("| Solver |");
  expect(md).toMatch(/fingerprint `[0-9a-f]{16}`/);
});

test("039: verification lab — automatic independent verification, tamper test, certificate file check", async ({ page }) => {
  await open(page);
  await generate(page, "random-int", 16, 6);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal", { timeout: 60_000 });
  await go(page, "verification");
  await expect(page.getByTestId("verdict")).toContainText("ACCEPTED", { timeout: 60_000 });
  await expect(page.getByTestId("evidence-independent")).toHaveAttribute("data-state", "established");
  await expect(page.getByTestId("evidence-lean")).toHaveAttribute("data-state", "not-available");
  await page.getByText("Tamper test").click();
  await page.getByTestId("tamper-beta").click();
  await expect(page.getByTestId("tamper-verdict")).toContainText("REJECTED", { timeout: 30_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-certificate").click()]);
  await page.setInputFiles("[data-testid=cert-file-input]", (await dl.path())!);
  await expect(page.getByTestId("cert-file-results")).toContainText("ACCEPTED", { timeout: 60_000 });
});

test("039: a heuristic result shows no bound and never claims optimality anywhere", async ({ page }) => {
  await open(page);
  await generate(page, "near-transitive", 50, 2);
  await go(page, "solver");
  await page.check("input[name=solver][value=heuristic]");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status-badge")).toHaveText("Feasible — not proven optimal", { timeout: 90_000 });
  await go(page, "verification");
  await expect(page.getByTestId("evidence-bound")).toHaveAttribute("data-state", "not-available");
  await expect(page.getByTestId("no-certificate")).toBeVisible();
});

test("039: local sessions save, restore and delete (browser storage only)", async ({ page }) => {
  await open(page);
  await page.getByTestId("data-input").fill("0,4\n-4,0\n");
  await page.selectOption("#interp", "skew");
  await page.fill('input[aria-label="Session name"]', "two items");
  await page.getByTestId("save-session").click();
  await expect(page.getByTestId("session-list")).toContainText("two items");
  await page.getByRole("button", { name: /Rank aggregation/ }).click();
  await page.getByTestId("session-list").getByRole("button", { name: "Restore" }).click();
  await expect(page.getByTestId("data-input")).toHaveValue("0,4\n-4,0\n");
  await page.getByRole("button", { name: "Delete session two items" }).click();
  await expect(page.getByTestId("session-list")).toHaveCount(0);
});

test("039: grid editor keeps a skew matrix skew and updates the model", async ({ page }) => {
  await open(page);
  await page.getByTestId("data-input").fill(",a,b,c\na,0,1,2\nb,-1,0,3\nc,-2,-3,0\n");
  await page.selectOption("#interp", "skew");
  await page.getByTestId("grid-tab").click();
  const cell = page.getByRole("textbox", { name: "a before b" });
  await cell.fill("5/2");
  await cell.press("Enter");
  await expect(page.getByTestId("validation-ok")).toContainText("3 items");
  await expect(page.getByRole("textbox", { name: "b before a" })).toHaveValue("-5/2");
});

test("039: keyboard shortcuts and light theme", async ({ page }) => {
  await open(page);
  await page.locator("body").press("Alt+2");
  await expect(page.getByTestId("problem-profile")).toBeVisible();
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.getByTestId("studio")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByTestId("studio")).toHaveAttribute("data-theme", "light");
  await page.locator("body").press("Control+Enter");
  await expect(page.getByTestId("job-state")).toHaveText("COMPLETED", { timeout: 60_000 });
});

test("039: Reset — clear results keeps the problem; start over restores defaults without a page refresh", async ({ page }) => {
  await open(page);
  await expect(page.getByTestId("reset")).toHaveCount(0); // nothing to reset yet
  await page.getByTestId("data-input").fill("0,4,-1\n-4,0,2\n1,-2,0\n");
  await page.selectOption("#interp", "skew");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status-badge")).toBeVisible();
  // clear results: the edited problem stays
  await page.getByTestId("reset").click();
  await page.getByTestId("clear-results").click();
  await expect(page.getByTestId("results")).toHaveCount(0);
  await expect(page.getByTestId("job-state")).toHaveCount(0);
  await go(page, "problem");
  await expect(page.getByTestId("data-input")).toHaveValue("0,4,-1\n-4,0,2\n1,-2,0\n");
  // run again, then start over: first example, default settings, Problem workspace
  await page.getByTestId("run").click();
  await expect(page.getByTestId("status-badge")).toBeVisible();
  await page.getByTestId("reset").click();
  await page.getByTestId("start-over").click();
  await expect(page.getByTestId("validation-ok")).toContainText("7 items");
  await expect(page.getByTestId("reset")).toHaveCount(0);
  await go(page, "results");
  await expect(page.getByTestId("results")).toHaveCount(0);
});
