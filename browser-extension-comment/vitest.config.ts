import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

const extensionRoot = path.resolve(__dirname);
const extensionSrc = path.resolve(__dirname, "src");
const backendRoot = path.resolve(__dirname, "..");

// Some tests exercise the backend (the Next.js project one level up), whose
// files also import "@/…" — but meaning the backend root, not this src. This
// sends those imports back to the backend, whichever way the alias below has
// already rewritten them. Imports from the extension's own files are untouched.
function backendImports(): Plugin {
  return {
    name: "backend-at-imports",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!importer || path.resolve(importer).startsWith(extensionRoot + path.sep)) return null;
      // One React for everything: website components some tests render come
      // with the backend's own (newer) React, and elements from one React
      // can't render in another — including the ones their icon library
      // creates. They use only basic hooks and common icons, so the
      // extension's copies run them the same.
      if (/^(react|react-dom|lucide-react)(\/.*)?$/.test(source)) {
        return this.resolve(source, path.join(extensionRoot, "vitest.config.ts"), { ...options, skipSelf: true });
      }
      let rest: string | null = null;
      if (source.startsWith("@/")) rest = source.slice(2);
      else if (path.isAbsolute(source) && path.resolve(source).startsWith(extensionSrc + path.sep)) {
        rest = path.relative(extensionSrc, path.resolve(source));
      }
      if (rest === null) return null;
      return this.resolve(path.join(backendRoot, rest), importer, { ...options, skipSelf: true });
    },
  };
}

// Separate from vite.config.ts on purpose: that config runs the crx plugin,
// which rewrites the manifest and bundles the extension — none of which a unit
// test wants.
export default defineConfig({
  plugins: [backendImports(), react()],
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
