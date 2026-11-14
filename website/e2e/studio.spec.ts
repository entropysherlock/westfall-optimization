/**
 * Acceptance tests (Mission 026, Part VI) for the complete upload-to-result workflow, run in a
 * real browser against the exported static site.
 */
import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const fx = (f: string) => path.join(__dirname, "fixtures", f);

async function open(page: Page) {
  await page.goto("/studio/");
  await expect(page.getByRole("heading", { name: "WESTFALL Studio", exact: true })).toBeVisible();
}

/** Mission 039 workstation: the solver radios live in the Solver workspace, inputs in the Problem workspace. */
const go = (page: Page, view: "problem" | "solver" | "results" | "analysis" | "verification" | "compare") => page.getByTestId(`nav-${view}`).click();

async function runAndWait(page: Page, solver: string, state = "COMPLETED") {
  await go(page, "solver");
  await page.check(`input[name=solver][value=${solver}]`);
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText(state, { timeout: 90_000 });
}

test("1: upload a matrix, solve exactly, exhaustive enumeration confirms the optimum", async ({ page }) => {
  await open(page);
  await page.setInputFiles("[data-testid=file-input]", fx("matrix.csv"));
  await expect(page.getByTestId("validation-ok")).toContainText("5 items");
  await expect(page.getByTestId("model-summary")).toContainText("skew");
  for (const solver of ["subset-dp", "autocut", "exclusion"]) {
    await runAndWait(page, solver);
    await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal");
    await expect(page.getByTestId("objective")).toHaveText("15"); // independently computed: max over all 120 orderings
    await expect(page.getByTestId("verification")).toContainText("exhaustive enumeration of 120 orderings: optimum attained");
    await expect(page.getByTestId("verified-badge")).toBeVisible();
  }
});

test("2: the same problem as an edge list gives an equivalent result", async ({ page }) => {
  await open(page);
  await page.setInputFiles("[data-testid=file-input]", fx("edges.csv"));
  await expect(page.getByTestId("validation-errors")).toContainText("choose how to read the edge weights");
  await page.selectOption("#interp", "skew");
  await expect(page.getByTestId("validation-ok")).toContainText("5 items");
  await runAndWait(page, "subset-dp");
  await expect(page.getByTestId("objective")).toHaveText("15");
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal");
});

test("3: malformed input produces useful validation errors and blocks solving", async ({ page }) => {
  await open(page);
  await page.setInputFiles("[data-testid=file-input]", fx("malformed.csv"));
  const errs = page.getByTestId("validation-errors");
  await expect(errs).toContainText("is not a number");
  await expect(errs).toContainText("row 2, column 3");
  await expect(page.getByTestId("run")).toBeDisabled();
  await page.getByTestId("data-input").fill("0,1\n2,0\n");
  await page.selectOption("#format", "matrix");
  await page.selectOption("#interp", "auto");
  await expect(errs).toContainText("not skew-symmetric");
});

test("4: a heuristic run never claims optimality", async ({ page }) => {
  await open(page);
  await page.setInputFiles("[data-testid=file-input]", fx("matrix.csv"));
  await runAndWait(page, "heuristic");
  await expect(page.getByTestId("status-badge")).toHaveText("Feasible — not proven optimal");
  await expect(page.getByTestId("status-note")).toContainText("NOT established");
  await expect(page.getByText("Proven optimal", { exact: true })).toHaveCount(0); // exact: "Feasible — not proven optimal" must not match
});

test("5: export JSON and CSV, re-import, and reproduce the result", async ({ page }) => {
  await open(page);
  await page.setInputFiles("[data-testid=file-input]", fx("matrix.csv"));
  await runAndWait(page, "autocut");
  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-csv").click()]);
  expect(fs.readFileSync((await csv.path())!, "utf8").split("\n")[0]).toBe("position,item,index");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByTestId("export-json").click()]);
  const file = (await dl.path())!;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(data.format).toBe("westfall-studio-result");
  expect(data.result.status).toBe("OPTIMAL");
  expect(data.result.objective).toBe("15");
  const order: string[] = data.result.order;
  // re-import: the exported ordering becomes the initial order and re-verifies at the optimum
  await go(page, "problem");
  await page.setInputFiles("[data-testid=file-input]", { name: "result.json", mimeType: "application/json", buffer: fs.readFileSync(file) });
  await expect(page.getByTestId("validation-ok")).toContainText("5 items");
  await runAndWait(page, "subset-dp");
  await expect(page.getByTestId("objective")).toHaveText("15");
  const rows = page.getByTestId("ordering-table").locator("tbody tr");
  await expect(rows).toHaveCount(5);
  // the initial objective of the re-imported order equals the optimum
  await expect(page.getByTestId("initial-objective")).toHaveText("15");
  expect(order).toHaveLength(5);
});

test("6: exact case with negative weights, fractions and ties", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /Negative weights and ties/ }).click();
  await expect(page.getByTestId("validation-ok")).toContainText("5 items");
  await runAndWait(page, "autocut");
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal");
  await expect(page.getByTestId("verification")).toContainText("optimum attained");
  await expect(page.getByTestId("verification")).toContainText(/\((\d+) optimal\)/);
  const text = await page.getByTestId("verification").innerText();
  expect(Number(/\((\d+) optimal\)/.exec(text)![1])).toBeGreaterThan(1); // ties: several optimal orderings
  await page.getByRole("tab", { name: "Structure" }).click();
  await expect(page.getByTestId("lambda")).toBeVisible();
});

function randomMatrix(n: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = Math.floor(rnd() * 19) - 9; M[i][j] = v; M[j][i] = -v; }
  return M.map((r) => r.join(",")).join("\n");
}

test("9a: a running job can be cancelled", async ({ page }) => {
  await open(page);
  // the heuristic keeps improving until its time budget (here 60 s), so it is reliably still running
  await page.getByRole("button", { name: /Large instance/ }).click();
  await expect(page.getByTestId("validation-ok")).toContainText("60 items");
  await go(page, "solver");
  await page.getByTestId("mode-advanced").click();
  await page.fill("#tl", "600");
  await page.check("input[name=solver][value=heuristic]");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText("RUNNING");
  await page.getByTestId("cancel").click();
  await expect(page.getByTestId("job-state")).toHaveText("CANCELLED");
  await expect(page.getByTestId("results")).toHaveCount(0);
});

test("9b: the time limit stops a job without producing a result", async ({ page }) => {
  await open(page);
  await page.getByTestId("data-input").fill(randomMatrix(20, 9));
  await page.selectOption("#format", "matrix");
  await page.selectOption("#interp", "skew");
  await go(page, "solver");
  await page.getByTestId("mode-advanced").click();
  await page.fill("#tl", "0.1");
  await page.check("input[name=solver][value=subset-dp]");
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText("FAILED", { timeout: 20_000 });
  await expect(page.getByTestId("job-error")).toContainText(/time limit/);
  await expect(page.getByTestId("results")).toHaveCount(0);
});

test("measured: exact subset DP runtime at n = 15 and n = 20 in this browser", async ({ page }) => {
  await open(page);
  for (const n of [15, 20]) {
    await go(page, "problem");
    await page.getByTestId("data-input").fill(randomMatrix(n, 3));
    await page.selectOption("#format", "matrix");
    await page.selectOption("#interp", "skew");
    await runAndWait(page, "subset-dp");
    const rt = await page.locator("section[aria-labelledby=compute-h]").getByText(/^\d+(\.\d+)? (ms|s)$/).first().innerText();
    console.log(`subset DP n=${n}: ${rt}`);
  }
});

test("9c: size limits are enforced per solver", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: /Large instance/ }).click();
  await expect(page.getByTestId("validation-ok")).toContainText("60 items");
  await go(page, "solver");
  await page.check("input[name=solver][value=subset-dp]");
  await expect(page.getByTestId("run")).toBeDisabled();
  await expect(page.getByText("This solver supports n ≤ 20 (instance has 60).").first()).toBeVisible();
  await runAndWait(page, "heuristic");
  await expect(page.getByTestId("status-badge")).toHaveText("Feasible — not proven optimal");
});

test("remote solver service is honestly reported as not configured", async ({ page }) => {
  await open(page);
  await go(page, "solver");
  await expect(page.getByTestId("remote-unconfigured")).toContainText("not configured");
});

test("038: ATLAS-032 is recommended for larger inputs, proves optimality, and its certificate verifies independently", async ({ page }) => {
  await open(page);
  // 14-item dense instance: recommendation must be ATLAS (n > 9) and explain itself
  const n = 14, rows: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = ((i * 7 + j * 11) % 9) - 4 || 1; rows[i][j] = v; rows[j][i] = -v; }
  await page.getByTestId("data-input").fill(rows.map((r) => r.join(",")).join("\n"));
  await page.selectOption("#interp", "skew");
  await go(page, "solver");
  await expect(page.getByTestId("recommendation")).toContainText("ATLAS");
  await expect(page.locator("input[name=solver][value=atlas]")).toBeChecked();
  await page.getByTestId("run").click();
  await expect(page.getByTestId("job-state")).toHaveText("COMPLETED", { timeout: 90_000 });
  await expect(page.getByTestId("status-badge")).toHaveText("Proven optimal");
  await expect(page.getByTestId("gap")).toHaveText("0 (proved)");
  await go(page, "verification");
  await page.getByTestId("verify-certificate").click();
  await expect(page.getByTestId("verdict")).toContainText("ACCEPTED", { timeout: 60_000 });
});
