// Builds "CarouseLabs Engage for Reddit" (manifest.reddit.config.ts) from the
// same source as the LinkedIn and X extensions. VITE_ENGAGE_PLATFORM=reddit
// switches the shared code to Reddit (src/lib/platform.ts). Output:
// dist-reddit/ (`npm run build:reddit`, or `-- --outDir dist-reddit-store`
// for the store build).
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import path from "node:path";
import manifest from "./manifest.reddit.config";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  // Its own icons: the X extension's chat bubble on orange, like the rest of
  // the Reddit extension (src/reddit/sidepanel/reddit-theme.css); same file
  // names as public/icons.
  publicDir: "public-reddit",
  define: {
    "import.meta.env.VITE_ENGAGE_PLATFORM": JSON.stringify("reddit"),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-reddit",
    rollupOptions: {
      // Opened by the service worker on install, so not in the manifest.
      input: { welcome: path.resolve(__dirname, "welcome-reddit.html") },
    },
  },
  server: {
    port: 5175,
    strictPort: true,
    hmr: {
      port: 5175,
    },
  },
});
