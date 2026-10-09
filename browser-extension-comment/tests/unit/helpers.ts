import fs from "node:fs";
import path from "node:path";
import { afterEach, vi } from "vitest";
import { chromeMock, deliverMessage } from "../setup/chrome";

const FIXTURE_DIR = path.resolve(__dirname, "../fixtures/linkedin");

export function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), "utf8");
}

// Replaces the jsdom document with a fixture and moves window.location to the
// LinkedIn path the page would have (the content scripts branch on it).
export function loadFixture(name: string, urlPath: string) {
  const parsed = new DOMParser().parseFromString(readFixture(name), "text/html");
  document.head.innerHTML = parsed.head.innerHTML;
  document.body.innerHTML = parsed.body.innerHTML;
  document.title = parsed.title;
  history.replaceState(null, "", urlPath);
}

// LinkedIn's newer design: the page is the new shell and Messaging lives in a
// same-origin frame. Loads the shell, then `frameFixture` into the frame, and
// gives the frame's window the same jsdom polyfills the page has
// (tests/setup/dom.ts) — a frame has its own HTMLElement, so the page's
// polyfills don't reach it. Returns the frame's document.
export function loadFixtureInMessagingFrame(frameFixture: string, urlPath: string): Document {
  loadFixture("messaging-new-shell.html", urlPath);
  const frame = document.querySelector<HTMLIFrameElement>('iframe[data-testid="interop-iframe"]');
  const win = frame?.contentWindow as (Window & typeof globalThis) | null;
  const doc = frame?.contentDocument;
  if (!win || !doc) throw new Error("messaging frame did not load");

  // jsdom never loads the frame's src, so its document starts with no <html>.
  const parsed = new DOMParser().parseFromString(readFixture(frameFixture), "text/html");
  const root = doc.documentElement ?? doc.appendChild(doc.createElement("html"));
  root.innerHTML = parsed.documentElement.innerHTML;

  const proto = win.HTMLElement.prototype;
  Object.defineProperty(proto, "innerText", Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerText")!);
  // Same approximation as the page's, without `instanceof` (the frame's
  // elements aren't instances of the page's HTMLElement).
  Object.defineProperty(proto, "offsetParent", {
    configurable: true,
    get(this: HTMLElement) {
      if (!this.isConnected || this.hidden || this.style.display === "none") return null;
      for (let el: Element | null = this.parentElement; el; el = el.parentElement) {
        const h = el as HTMLElement;
        if (h.hidden || h.style?.display === "none") return null;
      }
      return this.parentElement ?? doc.body;
    },
  });
  // The page's typing stand-in for execCommand (tests/setup/dom.ts).
  (win.Document.prototype as unknown as { execCommand: unknown }).execCommand = (
    Document.prototype as unknown as { execCommand: unknown }
  ).execCommand;
  return doc;
}

export function byFixture<T extends Element = HTMLElement>(id: string): T {
  const el = document.querySelector<T>(`[data-fixture="${id}"]`);
  if (!el) throw new Error(`fixture element "${id}" not found`);
  return el;
}

// content-script.ts runs side effects on import (a document click listener,
// a runtime.onMessage listener, a config fetch). Each call gets a fresh module
// instance, and the document listener it adds is removed after the test so
// instances never stack up across tests in one file.
const addedDocListeners: Array<[string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined]> = [];

afterEach(() => {
  for (const [type, fn, opts] of addedDocListeners.splice(0)) document.removeEventListener(type, fn, opts);
});

export interface ContentScriptOptions {
  config?: Record<string, unknown>;
  configStatus?: number;
  // The config route never answers (a stalled connection).
  configHangs?: boolean;
}

export async function importContentScript(options: ContentScriptOptions = {}) {
  vi.resetModules();
  const fetchMock = vi.fn(async () => {
    if (options.configHangs) return new Promise<Response>(() => {});
    const status = options.configStatus ?? 200;
    return new Response(JSON.stringify(options.config ?? {}), { status });
  });
  vi.stubGlobal("fetch", fetchMock);

  const realAdd = document.addEventListener.bind(document);
  const spy = vi.spyOn(document, "addEventListener").mockImplementation((type, fn, opts) => {
    addedDocListeners.push([type, fn, opts]);
    realAdd(type, fn, opts);
  });
  await import("@/content-script");
  spy.mockRestore();

  // The module kicks off its config fetch on load; let it settle.
  await flush();
  return { fetchMock };
}

// Content-script click handling is async (awaits config, storage). Several
// macrotask turns let every chained promise settle.
export async function flush(times = 5) {
  for (let i = 0; i < times; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function click(el: Element) {
  // jsdom can't navigate; stop a clicked <a href> from trying (after the
  // content script's capture-phase listener has already seen the click).
  el.addEventListener("click", (event) => event.preventDefault(), { once: true });
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await flush();
}

export function sendToContentScript(message: unknown) {
  return deliverMessage(chromeMock(), message);
}

export async function storedPost() {
  return (await chromeMock().storage.local.get("lastSelectedPost")).lastSelectedPost as
    | Record<string, unknown>
    | undefined;
}

// The same config the backend serves (app/api/ext/config), so tests exercise
// the selectors production actually uses rather than only the fallback copy.
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
