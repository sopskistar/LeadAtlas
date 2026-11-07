import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "workspace.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  outputDir: "../../test-results/visual-workspace",
  use: {
    baseURL: process.env.LEADATLAS_VISUAL_URL || "http://127.0.0.1:3101",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
