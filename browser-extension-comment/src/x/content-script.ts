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
import { insertSwitch as readInsertSwitch, readInsertEnabled } from "@/lib/insertSwitch";
import { X_INSERT_CHAT_MESSAGE_TYPE, X_INSERT_MESSAGE_TYPE, X_LAST_POST_STORAGE_KEY, X_READ_CHAT_MESSAGE_TYPE } from "@/x/lib/xPost";
import { insertIntoChat, readChat } from "@/x/content/xChat";
import { captureArticle, findReplyBox, postedAt, replyTargetOfClick, statusPath, type ComposerResult } from "@/x/content/xPage";
import { insertIntoDraft } from "@/x/content/xEditor";
import { waitFor } from "@/content/waitFor";
import { usableEditor } from "@/content/editor";
import { insertOnce, type InsertAnswer } from "@/lib/insertOnce";

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

// The server's Insert switch (/api/ext/config), from a recent reading or read
// again (lib/insertSwitch.ts). With no usable reading, nothing is inserted
// and the person is told it was the connection.
async function insertSwitch(): Promise<"on" | "off" | "unknown"> {
  const baseUrl = await getApiBaseUrl();
  return readInsertSwitch((signal) => readInsertEnabled(baseUrl, signal));
}

// Read once when the page opens, so the first Insert doesn't wait for it.
void insertSwitch();

type InsertRequest = {
  text: string;
  expect?: { postUrl?: string; threadPath?: string; handle?: string };
  // One per Insert click (src/lib/insertOnce.ts). Absent from older panels.
  insertId?: string;
};

// How long Insert waits for a reply box X is still opening.
const BOX_WAIT_MS = 2_000;

// The post a reply is for: this page's last Reply click, and only if it is
// the post the panel names. Never a guess from the panel's post alone: X's
// reply pop-up shows no link to its post, so only the click can say which
// post it is for.
function replyTargetFor(expected: string | null): typeof lastTarget {
  if (!lastTarget || (expected && lastTarget.statusPath && expected !== lastTarget.statusPath)) return null;
  return lastTarget;
}

function handleInsert(message: InsertRequest): Promise<InsertAnswer> {
  return insertOnce(message.insertId, (wrote) => insertNow(message, wrote));
}

async function insertNow(message: InsertRequest, wrote: () => void): Promise<InsertAnswer> {
  const insert = await insertSwitch();
  if (insert === "off") return { ok: false, error: "Insert is turned off right now. Use Copy instead." };
  if (insert === "unknown") {
    return { ok: false, error: "Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy." };
  }

  const target = replyTargetFor(statusPath(message.expect?.postUrl));
  if (!target) return { ok: false, error: "Click Reply on the post again, then Insert." };

  // A pop-up for a different post is a refusal straight away; no box yet is
  // waited for, briefly.
  const box = (): ComposerResult | null => {
    const found = findReplyBox(target);
    if (!found.ok) return found.error.includes("different post") ? found : null;
    return usableEditor(found.box) ? found : null;
  };
  const found = await waitFor(box, BOX_WAIT_MS);
  if (!found) {
    // Still no box after the wait, or one that can't be typed in (hidden).
    const now = findReplyBox(target);
    return now.ok ? { ok: false, error: "X's reply box isn't ready to type in. Click into it, then Insert." } : now;
  }
  if (!found.ok) return found;
  return insertIntoDraft(found.box, message.text, {
    refind: () => {
      const again = findReplyBox(target);
      return again.ok ? again.box : null;
    },
    onWrite: wrote,
  });
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
    insertOnce(message.insertId, (wrote) =>
      insertSwitch().then((insert) =>
        insert === "on"
          ? insertIntoChat(text, (message as InsertRequest).expect, document, wrote)
          : {
              ok: false,
              error:
                insert === "off"
                  ? "Insert is turned off right now. Use Copy instead."
                  : "Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy.",
            },
      ),
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
