// Builds "CarouseLabs Engage for X" (manifest.x.config.ts) from the same
// source as the LinkedIn extension (vite.config.ts). VITE_ENGAGE_PLATFORM=x
// switches the shared code to X (src/lib/platform.ts). Output: dist-x/
// (`npm run build:x`, or `-- --outDir dist-x-store` for the store build).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";
import manifest from "./manifest.x.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  // Its own icons (a filled bubble with an X), so the two extensions never
  // look alike side by side; same file names as public/icons.
  publicDir: "public-x",
  define: {
    "import.meta.env.VITE_ENGAGE_PLATFORM": JSON.stringify("x"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-x",
    rollupOptions: {
      // Opened by the service worker on install, so not in the manifest.
      input: { welcome: path.resolve(__dirname, "welcome-x.html") },
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: {
      port: 5174,
    },
  },
});
