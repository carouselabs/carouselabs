import { defineManifest } from "@crxjs/vite-plugin";

// "CarouseLabs Engage for Reddit": the third extension built from this folder
// (vite.reddit.config.ts). Same account and website as the LinkedIn and X
// ones (manifest.config.ts, manifest.x.config.ts), sold separately; its own
// listing, version and permissions. It only ever asks for www.reddit.com
// (new Reddit), never LinkedIn or X, and they never ask for Reddit.
//
// Versioned on its own: the LinkedIn extension's version lives in
// package.json, X's in manifest.x.config.ts.
export const REDDIT_VERSION = "1.0.0";

export default defineManifest(({ mode }) => {
  // localhost only in development builds, as in manifest.config.ts.
  const isDev = mode !== "production";

  return {
    manifest_version: 3,
    name: "CarouseLabs Engage for Reddit",
    version: REDDIT_VERSION,
    // Development builds only: when it was built (see manifest.config.ts).
    ...(isDev ? { version_name: `${REDDIT_VERSION} dev ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC` } : {}),
    description: "Write Reddit comments and replies in your own voice. You review and post every one yourself.",
    icons: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
    // "scripting": to put the content script into Reddit tabs that were
    // already open when the extension was installed or updated
    // (src/lib/tabs.ts). No install warning, and it only reaches the sites
    // below.
    permissions: ["sidePanel", "storage", "clipboardWrite", "scripting"],
    host_permissions: ["https://www.reddit.com/*", "https://carouselabs.com/*", ...(isDev ? ["http://localhost:3000/*"] : [])],
    background: {
      service_worker: "src/reddit/background.ts",
      type: "module",
    },
    content_scripts: [
      // The sign-in hand-off page, as in the LinkedIn extension; this one
      // relays only the Reddit extension's token (src/lib/platform.ts).
      {
        matches: [
          "https://carouselabs.com/extension-connect*",
          ...(isDev ? ["http://localhost:3000/extension-connect*"] : []),
        ],
        js: ["src/content/authRelay.ts"],
        run_at: "document_idle",
      },
      {
        matches: ["https://www.reddit.com/*"],
        js: ["src/reddit/content-script.ts"],
        run_at: "document_idle",
      },
    ],
    action: {
      default_title: "CarouseLabs Engage for Reddit",
      default_icon: {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      },
    },
    side_panel: {
      default_path: "src/reddit/sidepanel/index.html",
    },
  };
});
