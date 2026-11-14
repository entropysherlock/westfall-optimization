/**
 * Acceptance test 8 (navigation and responsive design) and a crawl of every internal link,
 * run on desktop and mobile viewports against the exported static site.
 */
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/technology/", "/research/", "/research/theorem/", "/research/manuscript/", "/research/paper/", "/formal-verification/",
  "/studio/", "/benchmarks/", "/applications/", "/docs/", "/docs/api/", "/about/", "/contact/", "/verify/", "/explainer/", "/roadmap/"];

test("every page renders with one h1, no console errors and no horizontal overflow", async ({ page }) => {
  for (const r of ROUTES) {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    const res = await page.goto(r);
    expect(res?.status(), r).toBe(200);
    await expect(page.locator("h1"), r).toHaveCount(1);
    await expect(page.locator("nav[aria-label='Main navigation']")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${r} horizontal overflow`).toBeLessThanOrEqual(1);
    expect(errors, r).toEqual([]);
    page.removeAllListeners("pageerror");
    page.removeAllListeners("console");
  }
});

test("all internal links resolve", async ({ page, request }) => {
  const seen = new Set<string>();
  for (const r of ROUTES) {
    await page.goto(r);
    const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute("href")!));
    for (const h of hrefs) if (h.startsWith("/") && !h.startsWith("//")) seen.add(h.split("#")[0]);
  }
  expect(seen.size).toBeGreaterThan(15);
  for (const h of seen) {
    const res = await request.get(h);
    expect(res.status(), h).toBe(200);
  }
});

test("navigation works from the menu (desktop links or mobile menu)", async ({ page, isMobile }) => {
  await page.goto("/");
  const targets: [string, RegExp][] = [["Technology", /Exact algorithms/], ["Research", /Structure and exactness/], ["Verification", /Eight flagship/], ["Documentation", /Westfall Optimization Studio/]];
  for (const [label, heading] of targets) {
    if (isMobile) {
      await page.getByRole("button", { name: "Menu" }).click();
      await page.locator("#mobile-nav").getByRole("link", { name: label }).click();
    } else {
      await page.locator("nav[aria-label='Main navigation']").getByRole("link", { name: label, exact: true }).first().click();
    }
    await expect(page.locator("h1")).toContainText(heading);
  }
  if (isMobile) {
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Optimization Studio" }).click();
  } else {
    await page.getByRole("link", { name: "Open Studio" }).click();
  }
  await expect(page.locator("h1")).toHaveText("WESTFALL Studio");
});

test("moved pages redirect", async ({ page }) => {
  await page.goto("/lab/");
  await expect(page).toHaveURL(/\/studio\/$/);
  await page.goto("/research/discovery-022/");
  await expect(page).toHaveURL(/\/research\/theorem\/$/);
});

test("contact form is honestly disabled without a configured delivery service", async ({ page }) => {
  await page.goto("/contact/");
  await expect(page.getByTestId("contact-unconfigured")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send inquiry" })).toBeDisabled();
});
