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

// Must match the ping handler in src/content-script.ts.
export const PING_MESSAGE_TYPE = "carouselabs:ping";

const LINKEDIN_ORIGIN = "https://www.linkedin.com/";

export function isLinkedInTab(tab: chrome.tabs.Tab | undefined): boolean {
  return !!tab?.url?.startsWith(LINKEDIN_ORIGIN);
}

// The LinkedIn conversation a tab's address shows, as its path
// ("/messaging/thread/2-abc/", the form the content script records as a
// conversation's threadPath), or null for any other page, including the inbox
// with none open and a new, empty message. Only the address is looked at:
// the panel and the toolbar icon can offer help with a conversation without
// reading anything until the person asks.
export function conversationPath(url: string | undefined | null): string | null {
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

// Whether two thread paths are the same conversation (with or without the
// trailing slash LinkedIn usually adds).
export function sameConversation(a: string, b: string): boolean {
  const trim = (path: string) => path.replace(/\/+$/, "");
  return trim(a) === trim(b);
}

// The LinkedIn content script's built files, as the manifest lists them. The
// names carry build hashes, so they can only be read at runtime.
export function linkedInContentScriptFiles(): string[] {
  const entry = chrome.runtime
    .getManifest()
    .content_scripts?.find((script) => script.matches?.some((match) => match.startsWith(LINKEDIN_ORIGIN)));
  return entry?.js ?? [];
}

// The manifest's LinkedIn file is only a loader (@crxjs/vite-plugin's): it
// import()s the real script, an ES module the manifest exposes to LinkedIn as
// a web-accessible resource. A tab loads a given module URL once and then
// reuses it, so injecting the loader again runs nothing, and after an update
// could even hand back the old copy that can no longer reach the extension.
// Injecting means importing the module under a URL of its own instead.
export function linkedInContentScriptModule(): string | null {
  const resources = chrome.runtime.getManifest().web_accessible_resources as
    | { matches?: string[]; resources?: string[] }[]
    | undefined;
  for (const entry of resources ?? []) {
    if (!entry.matches?.some((match) => match.startsWith(LINKEDIN_ORIGIN))) continue;
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

async function answersPing(tabId: number): Promise<boolean> {
  try {
    const res = (await chrome.tabs.sendMessage(tabId, { type: PING_MESSAGE_TYPE })) as { ok?: boolean } | undefined;
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
  const modulePath = linkedInContentScriptModule();
  const files = linkedInContentScriptFiles();
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
  for (let waited = 0; waited <= waitMs; waited += 100) {
    if (await answersPing(tabId)) return true;
    await sleep(100);
  }
  return false;
}

// Makes sure a LinkedIn tab has a working content script, so a Comment click
// in it reaches the panel. Nothing happens for other tabs.
export async function ensureContentScript(tab: chrome.tabs.Tab | undefined): Promise<boolean> {
  if (tab?.id === undefined || !isLinkedInTab(tab) || tab.discarded) return false;
  if (await answersPing(tab.id)) return true;
  return injectContentScript(tab.id);
}

// chrome.tabs.sendMessage to a LinkedIn tab that may have no content script:
// when nothing answers, injects one and sends again. Throws what
// chrome.tabs.sendMessage threw if the tab still can't be reached.
export async function sendToTab<T>(tab: chrome.tabs.Tab, message: unknown): Promise<T> {
  if (tab.id === undefined) throw new Error("No tab to send to");
  try {
    return (await chrome.tabs.sendMessage(tab.id, message)) as T;
  } catch (err) {
    if (!isLinkedInTab(tab) || !(await injectContentScript(tab.id))) throw err;
    return (await chrome.tabs.sendMessage(tab.id, message)) as T;
  }
}

// What to tell the user when a tab still can't be reached. On LinkedIn that
// now means even injecting failed, which a reload fixes; anywhere else they
// need to be on LinkedIn first.
export function noContentScriptMessage(tab: chrome.tabs.Tab | undefined, notOnLinkedIn: string): string {
  return isLinkedInTab(tab)
    ? "Couldn't reach this LinkedIn tab. Reload the page, then try again."
    : notOnLinkedIn;
}
