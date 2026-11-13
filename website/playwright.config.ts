import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the exported static site (`npm run build` first).
 * Locally, PW_CHROME may point to an installed Chrome; CI uses Playwright's bundled Chromium.
 */
const executablePath = process.env.PW_CHROME || undefined;
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4321", trace: "off", launchOptions: { executablePath, args: executablePath ? ["--no-sandbox"] : [] } },
  webServer: { command: "node scripts/serve-static.mjs out 4321", port: 4321, reuseExistingServer: true },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /\.mobile\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /(navigation|studio039\.mobile)\.spec\.ts/ },
  ],
});
