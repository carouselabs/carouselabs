import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Separate from vite.config.ts on purpose: that config runs the crx plugin,
// which rewrites the manifest and bundles the extension — none of which a unit
// test wants.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      // Content scripts read window.location (isMessagingPage, isProfilePage,
      // pageSlug). Tests move between paths with history.replaceState.
      jsdom: { url: "https://www.linkedin.com/feed/" },
    },
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup/dom.ts", "tests/setup/chrome.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/components/ui/**"],
      reporter: ["text", "html"],
    },
  },
});
