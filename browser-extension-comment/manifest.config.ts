import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "CarouseLabs Comment",
  version: pkg.version,
  description:
    "Generate and post AI-assisted LinkedIn comments from CarouseLabs.",
  icons: {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  permissions: ["sidePanel", "storage", "clipboardWrite"],
  host_permissions: [
    "https://www.linkedin.com/*",
    "https://carouselabs.com/*",
    // Local dev only — same pattern as browser-extension-ideas/manifest.json.
    // Remove before shipping to production; see README.
    "http://localhost:3000/*",
  ],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  content_scripts: [
    // Injected only into the sign-in hand-off page (app/extension-connect) —
    // relays its one-time postMessage into the extension. See
    // src/content/authRelay.ts and src/background.ts.
    {
      matches: [
        "https://carouselabs.com/extension-connect*",
        // Local dev only — same reasoning as host_permissions below.
        "http://localhost:3000/extension-connect*",
      ],
      js: ["src/content/authRelay.ts"],
      run_at: "document_idle",
    },
    // Detects clicks on a post's Comment button and extracts post data for
    // the side panel. See src/content-script.ts.
    {
      matches: ["https://www.linkedin.com/*"],
      js: ["src/content-script.ts"],
      run_at: "document_idle",
    },
  ],
  // A real global shortcut: chrome.commands fires in the service worker even
  // while the LinkedIn page has focus, which a listener inside the side panel
  // could not do. The service worker relays it to the panel (see
  // src/background.ts). Chrome does not allow an extension to CHANGE its own
  // shortcut, so Settings displays the binding and links to
  // chrome://extensions/shortcuts for rebinding.
  commands: {
    "generate-comment": {
      suggested_key: { default: "Alt+Shift+G", mac: "Alt+Shift+G" },
      description: "Generate a comment for the selected LinkedIn post",
    },
  },
  action: {
    default_title: "CarouseLabs Comment",
    default_icon: {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png",
    },
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
});
