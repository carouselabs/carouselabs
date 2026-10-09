import { defineManifest } from "@crxjs/vite-plugin";

// "CarouseLabs Engage for X": the second extension built from this folder
// (vite.x.config.ts). Same account, plan and website as the LinkedIn one
// (manifest.config.ts); its own listing, version and permissions. It never
// asks for LinkedIn, and the LinkedIn one never asks for X.
//
// Versioned on its own: the LinkedIn extension's version lives in
// package.json.
export const X_VERSION = "1.0.2";

export default defineManifest(({ mode }) => {
  // localhost only in development builds, as in manifest.config.ts.
  const isDev = mode !== "production";

  return {
    manifest_version: 3,
    name: "CarouseLabs Engage for X",
    version: X_VERSION,
    // Development builds only: when it was built (see manifest.config.ts).
    ...(isDev ? { version_name: `${X_VERSION} dev ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC` } : {}),
    description: "Write X replies and messages in your own voice. You review and post every one yourself.",
    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    // "scripting": to put the content script into X tabs that were already
    // open when the extension was installed or updated (src/lib/tabs.ts). No
    // install warning, and it only reaches the sites below.
    permissions: ["sidePanel", "storage", "clipboardWrite", "scripting"],
    host_permissions: ["https://x.com/*", "https://carouselabs.com/*", ...(isDev ? ["http://localhost:3000/*"] : [])],
    background: {
      service_worker: "src/x/background.ts",
      type: "module",
    },
    content_scripts: [
      // The sign-in hand-off page, as in the LinkedIn extension; this one
      // relays only the X extension's token (src/lib/platform.ts).
      {
        matches: [
          "https://carouselabs.com/extension-connect*",
          ...(isDev ? ["http://localhost:3000/extension-connect*"] : []),
        ],
        js: ["src/content/authRelay.ts"],
        run_at: "document_idle",
      },
      {
        matches: ["https://x.com/*"],
        js: ["src/x/content-script.ts"],
        run_at: "document_idle",
      },
    ],
    action: {
      default_title: "CarouseLabs Engage for X",
      default_icon: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
    },
    side_panel: {
      default_path: "src/x/sidepanel/index.html",
    },
  };
});
