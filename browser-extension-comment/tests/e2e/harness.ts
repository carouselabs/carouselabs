// Playwright harness: launches Chromium with the built extension loaded, and
// intercepts EVERY request the browser makes. LinkedIn URLs are answered from
// tests/fixtures/linkedin, the API from canned JSON, and anything else is
// aborted — so no test can ever reach the real linkedin.com or carouselabs.com.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, test as base, type BrowserContext, type Page, type Worker } from "@playwright/test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = path.join(ROOT, "dist");
const FIXTURES = path.join(ROOT, "tests/fixtures/linkedin");

export const SERVER_CONFIG = {
  commentButtonSelector: "button[aria-label^='Comment'], button.comment-button",
  postContainerSelector: "div[role='listitem'][componentkey^='update-card-focus']",
  postContainerFallbackSelector: "[componentkey^='update-card-focus']",
  authorProfileHrefSelector: 'a[href*="/in/"], a[href*="/company/"]',
  authorLinkSelector: `a[aria-label^="View "][aria-label$="'s profile"]`,
  authorHeaderSelector: "[componentkey^='feed-header']",
  postTextSelector: '[data-testid="expandable-text-box"]',
  commentItemSelector:
    "[componentkey*='replaceableComment_urn:li:comment:'], [componentkey*='CommentComponentReference_urn:li:comment:']",
  imageIndicatorSelector: ".update-components-image",
  articleIndicatorSelector: ".update-components-article",
  pollIndicatorSelector: ".update-components-poll",
  repostIndicatorSelector:
    ".update-components-mini-update-v2, .feed-shared-reshared-update-v2, .update-components-actor--reshared",
  commentBoxSelector:
    "div[contenteditable='true'][role='textbox'], div.ql-editor[contenteditable='true'], div[contenteditable='true'][aria-label*='comment' i]",
  insertEnabled: true,
};

export interface Harness {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  // Path on linkedin.com → fixture file name. Unmapped LinkedIn paths 404.
  pages: Map<string, string>;
  apiResponses: Map<string, { status: number; body: unknown }>;
  blocked: string[];
  open(pathname: string, fixture: string): Promise<Page>;
  sendToLinkedInTab<T = unknown>(message: unknown): Promise<T>;
  storage(): Promise<Record<string, any>>;
}

export const test = base.extend<{ harness: Harness }>({
  // eslint-disable-next-line no-empty-pattern
  harness: async ({}, use) => {
    if (!fs.existsSync(path.join(DIST, "manifest.json"))) {
      throw new Error("dist/ is missing — run `npm run build:dev` first (npm run test:e2e does this).");
    }
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "cl-e2e-"));
    const context = await chromium.launchPersistentContext(profileDir, {
      channel: "chromium",
      headless: true,
      args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    });

    const pages = new Map<string, string>();
    const apiResponses = new Map<string, { status: number; body: unknown }>([
      ["/api/ext/config", { status: 200, body: SERVER_CONFIG }],
    ]);
    const blocked: string[] = [];

    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      // The extension's own bundle (panel JS, the content script's lazily
      // imported module) is local, not web traffic — let it load.
      if (url.protocol === "chrome-extension:" || url.protocol === "data:") return route.continue();
      if (url.hostname === "www.linkedin.com") {
        const fixture = pages.get(url.pathname);
        if (!fixture) return route.fulfill({ status: 404, body: "" });
        return route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: fs.readFileSync(path.join(FIXTURES, fixture), "utf8"),
        });
      }
      if (url.hostname === "carouselabs.com" || url.hostname === "localhost") {
        const canned = apiResponses.get(url.pathname);
        if (canned) {
          return route.fulfill({
            status: canned.status,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify(canned.body),
          });
        }
      }
      blocked.push(url.href);
      return route.abort();
    });

    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;
    // Point the extension at the intercepted production host rather than the
    // dev build's http://localhost:3000, which an https page may not fetch.
    await worker.evaluate(() => chrome.storage.local.set({ apiBaseUrl: "https://carouselabs.com" }));

    const harness: Harness = {
      context,
      worker,
      extensionId,
      pages,
      apiResponses,
      blocked,
      async open(pathname, fixture) {
        pages.set(pathname, fixture);
        const page = await context.newPage();
        const loaded = page.waitForEvent("console", {
          predicate: (msg) => msg.text().startsWith("[content-script] loaded on"),
          timeout: 15_000,
        });
        await page.goto(`https://www.linkedin.com${pathname}`);
        await loaded;
        return page;
      },
      async sendToLinkedInTab(message) {
        return worker.evaluate(async (msg) => {
          const [tab] = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
          return chrome.tabs.sendMessage(tab.id!, msg);
        }, message) as Promise<never>;
      },
      async storage() {
        return worker.evaluate(() => chrome.storage.local.get(null));
      },
    };

    await use(harness);
    await context.close();
    fs.rmSync(profileDir, { recursive: true, force: true });
  },
});

export { expect } from "@playwright/test";
