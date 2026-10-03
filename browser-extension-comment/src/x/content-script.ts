// Content script for x.com (CarouseLabs Engage for X).
//
// Reading an X chat (when the person clicks Read in the panel) and filling
// its message box live in src/x/content/xChat.ts.
//
// Reply on a post (or, on a post's own page, clicking into "Post your reply")
// captures that post, with the conversation above it and any post it
// quotes, for the panel (src/x/lib/xPost.ts). Insert puts the panel's text
// into the reply box for that same post, and only that one: never the box
// for writing a new post, never another post's reply. Nothing is posted; the
// person presses Reply. Reading the page lives in src/x/content/xPage.ts,
// written against saved copies of real X pages (tests/fixtures/x).
import { getApiBaseUrl } from "@/lib/api";
import { PING_MESSAGE_TYPE } from "@/lib/tabs";
import { X_INSERT_CHAT_MESSAGE_TYPE, X_INSERT_MESSAGE_TYPE, X_LAST_POST_STORAGE_KEY, X_READ_CHAT_MESSAGE_TYPE } from "@/x/lib/xPost";
import { insertIntoChat, readChat } from "@/x/content/xChat";
import { captureArticle, findReplyBox, postedAt, replyTargetOfClick, statusPath } from "@/x/content/xPage";
import { insertIntoDraft } from "@/x/content/xEditor";

const DEV = import.meta.env.MODE !== "production";
if (DEV) console.log("[x-content-script] loaded on", window.location.href);

// Development builds only: Ctrl+Alt+Shift+S saves the page's layout with all
// text scrubbed, for building against X's Chat (src/x/content/devSnapshot.ts).
// The MODE check is a build-time constant, so store builds drop it entirely.
let stopLayoutShortcut: (() => void) | null = null;
if (import.meta.env.MODE !== "production") {
  void import("@/x/content/devSnapshot").then(({ listenForLayoutShortcut }) => {
    stopLayoutShortcut = listenForLayoutShortcut();
  });
}

// The post the last Reply click was for, so Insert can find its reply box.
let lastTarget: { statusPath: string; postedAt: string; handle: string } | null = null;

function onDocumentClick(event: MouseEvent) {
  if (!extensionConnected()) {
    instance.teardown();
    return;
  }
  const target = event.target instanceof Element ? event.target : null;
  const article = target ? replyTargetOfClick(target) : null;
  if (!article) return;

  const captured = captureArticle(article);
  lastTarget = {
    statusPath: statusPath(captured.post.url) ?? "",
    postedAt: postedAt(article),
    handle: captured.post.handle,
  };
  // Other people's posts go to the page console only in development builds.
  if (DEV) console.log("[x-content-script] reply target captured:", captured);
  chrome.storage.local.set({ [X_LAST_POST_STORAGE_KEY]: captured }).catch(() => {
    // The extension was updated or switched off; the next click repairs it.
  });
}

// The server's Insert switch (/api/ext/config), checked at the moment of
// Insert. If it can't be read, nothing is inserted and the person is told it
// was the connection.
const CONFIG_TIMEOUT_MS = 8_000;
async function insertSwitch(): Promise<"on" | "off" | "unknown"> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const res = await fetch(`${await getApiBaseUrl()}/api/ext/config`, { signal: controller.signal });
    if (!res.ok) return "unknown";
    const config = (await res.json()) as { insertEnabled?: boolean };
    return config.insertEnabled === false ? "off" : "on";
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

type InsertRequest = { text: string; expect?: { postUrl?: string; threadPath?: string; handle?: string } };

async function handleInsert(message: InsertRequest): Promise<{ ok: boolean; error?: string }> {
  const insert = await insertSwitch();
  if (insert === "off") return { ok: false, error: "Insert is turned off right now. Use Copy instead." };
  if (insert === "unknown") {
    return { ok: false, error: "Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy." };
  }

  const expected = statusPath(message.expect?.postUrl);
  if (!lastTarget || (expected && lastTarget.statusPath && expected !== lastTarget.statusPath)) {
    return { ok: false, error: "Click Reply on the post again, then Insert." };
  }

  const found = findReplyBox(lastTarget);
  if (!found.ok) return found;
  const inserted = await insertIntoDraft(found.box, message.text);
  return inserted ? { ok: true } : { ok: false, error: "Couldn't type into X's reply box. Use Copy instead." };
}

function onRuntimeMessage(
  message: { type?: string } & Partial<InsertRequest>,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): boolean | void {
  if (message?.type === PING_MESSAGE_TYPE) {
    sendResponse({ ok: true });
    return;
  }
  if (message?.type === X_READ_CHAT_MESSAGE_TYPE) {
    sendResponse(readChat());
    return;
  }
  if (message?.type === X_INSERT_CHAT_MESSAGE_TYPE && typeof message.text === "string") {
    const text = message.text;
    insertSwitch()
      .then((insert) =>
        insert === "on"
          ? insertIntoChat(text, (message as InsertRequest).expect)
          : {
              ok: false,
              error:
                insert === "off"
                  ? "Insert is turned off right now. Use Copy instead."
                  : "Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy.",
            },
      )
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }
  if (message?.type === X_INSERT_MESSAGE_TYPE && typeof message.text === "string") {
    handleInsert(message as InsertRequest)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the channel open for the async sendResponse above
  }
}

// ── One live copy per tab ── (see the end of src/content-script.ts)
const INSTANCE_KEY = "__carouselabsXContentScript";
type Instance = { teardown: () => void };
const instances = window as unknown as Record<string, Instance | undefined>;

function extensionConnected(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

const instance: Instance = {
  teardown() {
    document.removeEventListener("click", onDocumentClick, true);
    stopLayoutShortcut?.();
    try {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    } catch {
      // The connection is already gone, and the listener with it.
    }
    if (instances[INSTANCE_KEY] === instance) delete instances[INSTANCE_KEY];
  },
};

instances[INSTANCE_KEY]?.teardown();
instances[INSTANCE_KEY] = instance;

chrome.runtime.onMessage.addListener(onRuntimeMessage);
// Capture phase on document: runs before X's own handlers, which may stop
// the click from bubbling.
document.addEventListener("click", onDocumentClick, true);
