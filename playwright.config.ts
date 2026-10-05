import { defineConfig } from "@playwright/test"
const baseURL = process.env.AUDIT_ORIGIN || "http://localhost:3102"
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) throw new Error("Browser tests are restricted to localhost")
export default defineConfig({
  testDir: "tests/e2e", timeout: 45000, workers: 1, retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure", reducedMotion: "reduce" },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true } },
    { name: "tablet", use: { browserName: "chromium", viewport: { width: 768, height: 1024 } } },
  ],
})
