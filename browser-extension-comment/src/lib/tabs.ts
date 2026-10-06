// src/lib/tabs.ts — side panel ↔ LinkedIn tab messaging helpers.
//
// Chrome runs content scripts only in pages loaded AFTER the extension is
// installed or updated. A LinkedIn tab that was already open has no copy (or
// a dead one from the previous version, which can't talk to the extension any
// more), so chrome.tabs.sendMessage to it throws and Comment clicks in it go
// nowhere. Instead of asking the user to reload, the extension injects the
// content script into such tabs itself: the service worker does it for every
// open LinkedIn tab on install/update (src/background.ts), and the side panel
// does it on demand for the tab it's about to talk to (sendToTab,
// ensureContentScript). A fresh copy replaces any older one in the tab (see
// the takeover at the bottom of src/content-script.ts).

import { PLATFORM, SITE_ORIGIN } from "@/lib/platform";

// Must match the ping handler in src/content-script.ts (and src/x/content-script.ts).
export const PING_MESSAGE_TYPE = "carouselabs:ping";

const LINKEDIN_ORIGIN = "https://www.linkedin.com/";

// A tab on the site this extension works on: LinkedIn, or X in the X
// extension (src/lib/platform.ts). Chrome shows a tab's address only for
// sites the extension has permission for, so this needs no "tabs" permission.
export function isSiteTab(tab: chrome.tabs.Tab | undefined): boolean {
  return !!tab?.url?.startsWith(SITE_ORIGIN);
}

// The LinkedIn conversation a tab's address shows, as its path
// ("/messaging/thread/2-abc/", the form the content script records as a
// conversation's threadPath), or null for any other page, including the inbox
// with none open and a new, empty message. Only the address is looked at:
// the panel and the toolbar icon can offer help with a conversation without
// reading anything until the person asks.
// In the X extension, an X chat: "/i/chat/<id>" (src/x/content/xChat.ts).
export function conversationPath(url: string | undefined | null): string | null {
  if (PLATFORM === "x") return xChatPath(url);
  if (!url?.startsWith(LINKEDIN_ORIGIN)) return null;
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }
  const match = /^\/messaging\/thread\/([^/]+)\/?/.exec(pathname);
  if (!match || match[1] === "new") return null;
  return `/messaging/thread/${match[1]}/`;
}

function xChatPath(url: string | undefined | null): string | null {
  if (!url?.startsWith("https://x.com/")) return null;
  try {
    const match = /^\/i\/chat\/([^/]+)\/?$/.exec(new URL(url).pathname);
    return match ? `/i/chat/${match[1]}` : null;
  } catch {
    return null;
  }
}

// Whether two thread paths are the same conversation (with or without the
// trailing slash LinkedIn usually adds).
export function sameConversation(a: string, b: string): boolean {
  const trim = (path: string) => path.replace(/\/+$/, "");
  return trim(a) === trim(b);
}

// The site's content script's built files, as the manifest lists them. The
// names carry build hashes, so they can only be read at runtime.
export function siteContentScriptFiles(): string[] {
  const entry = chrome.runtime
    .getManifest()
    .content_scripts?.find((script) => script.matches?.some((match) => match.startsWith(SITE_ORIGIN)));
  return entry?.js ?? [];
}

// The manifest's site file (LinkedIn's or X's) is only a loader (@crxjs/vite-plugin's): it
// import()s the real script, an ES module the manifest exposes to LinkedIn as
// a web-accessible resource. A tab loads a given module URL once and then
// reuses it, so injecting the loader again runs nothing, and after an update
// could even hand back the old copy that can no longer reach the extension.
// Injecting means importing the module under a URL of its own instead.
export function siteContentScriptModule(): string | null {
  const resources = chrome.runtime.getManifest().web_accessible_resources as
    | { matches?: string[]; resources?: string[] }[]
    | undefined;
  for (const entry of resources ?? []) {
    if (!entry.matches?.some((match) => match.startsWith(SITE_ORIGIN))) continue;
    const modulePath = entry.resources?.find((file) => /(^|\/)content-script\.ts-[\w-]+\.js$/.test(file));
    if (modulePath) return modulePath;
  }
  return null;
}

// Runs inside the tab (chrome.scripting serializes it), so it can use nothing
// from this module. @vite-ignore keeps the import exactly as written: a
// bundler helper here wouldn't exist in the tab.
function importFresh(url: string) {
  import(/* @vite-ignore */ url).catch((err) => console.error("[content-script] injection failed:", err));
}

// How long the panel waits for a LinkedIn tab to answer. Reading a
// conversation or inserting takes well under a second; at worst Insert reads
// the server's switch (gives up after 4s, src/lib/insertSwitch.ts) and waits
// for a box that is still opening (2s). A tab that hasn't answered by then
// never will, and the panel says so instead of spinning.
export const TAB_ANSWER_TIMEOUT_MS = 12_000;
const PING_TIMEOUT_MS = 1_000;

// The tab took too long to answer. Not retried: the message may still be
// carried out late, and a second Insert would type the text twice.
export class TabTimeout extends Error {
  constructor() {
    super("The LinkedIn tab didn't answer in time");
    this.name = "TabTimeout";
  }
}

function answerWithin<T>(answer: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TabTimeout()), ms);
    answer.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function answersPing(tabId: number): Promise<boolean> {
  try {
    const res = (await answerWithin(chrome.tabs.sendMessage(tabId, { type: PING_MESSAGE_TYPE }), PING_TIMEOUT_MS)) as
      | { ok?: boolean }
      | undefined;
    return res?.ok === true;
  } catch {
    return false;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Injects the content script into a tab and waits until it answers. The
// manifest's file is a loader that imports the real script asynchronously,
// so executeScript returning doesn't yet mean anything is listening. False
// when it can't be done: a discarded tab, a page still being replaced, or no
// permission for it.
export async function injectContentScript(tabId: number, waitMs = 3000): Promise<boolean> {
  const modulePath = siteContentScriptModule();
  const files = siteContentScriptFiles();
  try {
    if (modulePath) {
      // A fresh URL, so the tab runs the script anew rather than reusing a
      // copy it already has; the new copy then replaces the old one.
      const url = `${chrome.runtime.getURL(modulePath)}?injected=${Date.now()}`;
      await chrome.scripting.executeScript({ target: { tabId }, func: importFresh, args: [url] });
    } else if (files.length > 0) {
      // A build without a loader: the manifest's files are the script itself.
      await chrome.scripting.executeScript({ target: { tabId }, files });
    } else {
      return false;
    }
  } catch {
    return false;
  }
  // At most waitMs by the clock (a ping can itself take up to
  // PING_TIMEOUT_MS), and never more tries than one per 100ms of it.
  const until = Date.now() + waitMs;
  for (let tries = 0; tries <= waitMs / 100 && Date.now() <= until; tries += 1) {
    if (await answersPing(tabId)) return true;
    await sleep(100);
  }
  return false;
}

// Makes sure a LinkedIn tab has a working content script, so a Comment click
// in it reaches the panel. Nothing happens for other tabs.
export async function ensureContentScript(tab: chrome.tabs.Tab | undefined): Promise<boolean> {
  if (tab?.id === undefined || !isSiteTab(tab) || tab.discarded) return false;
  if (await answersPing(tab.id)) return true;
  return injectContentScript(tab.id);
}

// chrome.tabs.sendMessage to a LinkedIn tab that may have no content script:
// when nothing answers, injects one and sends again. Throws what
// chrome.tabs.sendMessage threw if the tab still can't be reached.
export async function sendToTab<T>(tab: chrome.tabs.Tab, message: unknown): Promise<T> {
  if (tab.id === undefined) throw new Error("No tab to send to");
  try {
    return (await answerWithin(chrome.tabs.sendMessage(tab.id, message), TAB_ANSWER_TIMEOUT_MS)) as T;
  } catch (err) {
    if (err instanceof TabTimeout || !isSiteTab(tab) || !(await injectContentScript(tab.id))) throw err;
    return (await answerWithin(chrome.tabs.sendMessage(tab.id, message), TAB_ANSWER_TIMEOUT_MS)) as T;
  }
}

// What to tell the user when a tab still can't be reached. On LinkedIn that
// now means even injecting failed, which a reload fixes; anywhere else they
// need to be on LinkedIn first.
export function noContentScriptMessage(tab: chrome.tabs.Tab | undefined, notOnLinkedIn: string): string {
  return isSiteTab(tab)
    ? "Couldn't reach this LinkedIn tab. Reload the page, then try again."
    : notOnLinkedIn;
}
