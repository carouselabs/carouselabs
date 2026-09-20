import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

// localhost entries exist only so the extension can be pointed at a local
// Next.js server during development (see src/lib/api.ts's apiBaseUrl
// override). A production build must not ship them: the Chrome Web Store
// treats a localhost host permission as a reviewable capability, and it
// grants the extension access it has no reason to hold on a user's machine.
//
// Gated on the build mode rather than deleted, so `npm run dev` keeps working
// and nobody has to remember to re-add them. `npm run build` sets mode
// "production", so the packaged zip is clean by construction rather than by
// discipline.
export default defineManifest(({ mode }) => {
  const isDev = mode !== "production";

  return {
  manifest_version: 3,
  name: "CarouseLabs Comment",
  version: pkg.version,
  description:
    "Generate LinkedIn comments in your own voice. You review and post every one yourself.",
  icons: {
    16: "icons/icon16.png",
    48: "icons/icon48.png",
    128: "icons/icon128.png",
  },
  permissions: ["sidePanel", "storage", "clipboardWrite"],
  host_permissions: [
    "https://www.linkedin.com/*",
    "https://carouselabs.com/*",
    ...(isDev ? ["http://localhost:3000/*"] : []),
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
        ...(isDev ? ["http://localhost:3000/extension-connect*"] : []),
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
  };
});
