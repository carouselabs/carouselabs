import { defineConfig } from "@playwright/test";

// E2E runs the BUILT extension (dist/, from `npm run build:dev`) in real
// Chromium. One worker: each test owns a persistent browser profile, and
// extensions can't be shared across contexts.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
});
