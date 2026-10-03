// lib/contentScriptOrigins.ts — the pages the extensions' content scripts run
// on, and so the only origins app/api/ext/config answers with CORS headers:
// LinkedIn (browser-extension-comment/manifest.config.ts) and X
// (manifest.x.config.ts). The e2e harness answers with the same list, so a
// page missing here fails the tests the way it fails in production.
export const CONTENT_SCRIPT_ORIGINS = ["https://www.linkedin.com", "https://x.com"]
