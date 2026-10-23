// Content script for www.reddit.com (CarouseLabs Engage for Reddit).
//
// Reply under a comment, or clicking into the box for commenting on a post,
// captures that comment (with the comments above it) or that post (with its
// top comments), plus the subreddit's rules, for the panel
// (src/reddit/lib/redditPost.ts). Insert puts the panel's text into the box
// for that same comment or post, and only that one: never another comment's
// reply box. Nothing is posted; the person presses Comment. Reading the page
// lives in src/reddit/content/redditPage.ts, written against saved copies of
// real Reddit pages (tests/fixtures/reddit).
import { getApiBaseUrl } from "@/lib/api";
import { PING_MESSAGE_TYPE } from "@/lib/tabs";
import { insertSwitch as readInsertSwitch, readInsertEnabled } from "@/lib/insertSwitch";
import { REDDIT_INSERT_MESSAGE_TYPE, REDDIT_LAST_TARGET_STORAGE_KEY, type RedditCapturedTarget } from "@/reddit/lib/redditPost";
import { captureTarget, findCommentBox, replyTargetOfClick, type BoxResult } from "@/reddit/content/redditPage";
import { typeInto, usableEditor } from "@/content/editor";
import { waitFor } from "@/content/waitFor";
import { insertOnce, type InsertAnswer } from "@/lib/insertOnce";

const DEV = import.meta.env.MODE !== "production";
if (DEV) console.log("[reddit-content-script] loaded on", window.location.href);

// Development builds only: Ctrl+Alt+Shift+S saves the page's layout with all
// text scrubbed, for building against Reddit's comment box, which "Save page
// as" can't see (src/content/devSnapshot.ts). The MODE check is a build-time
// constant, so store builds drop it entirely.
let stopLayoutShortcut: (() => void) | null = null;
if (import.meta.env.MODE !== "production") {
  void import("@/content/devSnapshot").then(({ listenForLayoutShortcut }) => {
    stopLayoutShortcut = listenForLayoutShortcut("reddit");
  });
}

// What the last Reply click was for, so Insert finds its box.
let lastTarget: Pick<RedditCapturedTarget, "postId" | "replyToId"> | null = null;

function onDocumentClick(event: MouseEvent) {
  if (!extensionConnected()) {
    instance.teardown();
    return;
  }
  const target = replyTargetOfClick(event.composedPath());
  if (!target) return;
  const captured = captureTarget(target);
  if (!captured) return;
  lastTarget = { postId: captured.postId, replyToId: captured.replyToId };
  // Other people's posts go to the page console only in development builds.
  if (DEV) console.log("[reddit-content-script] reply target captured:", captured);
  chrome.storage.local.set({ [REDDIT_LAST_TARGET_STORAGE_KEY]: captured }).catch(() => {
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
  // The post and comment the panel wrote for.
  expect?: { postId?: string; replyToId?: string | null };
  // One per Insert click (src/lib/insertOnce.ts).
  insertId?: string;
};

// How long Insert waits for a box Reddit is still opening.
const BOX_WAIT_MS = 2_000;

function handleInsert(message: InsertRequest): Promise<InsertAnswer> {
  return insertOnce(message.insertId, (wrote) => insertNow(message, wrote));
}

async function insertNow(message: InsertRequest, wrote: () => void): Promise<InsertAnswer> {
  const insert = await insertSwitch();
  if (insert === "off") return { ok: false, error: "Insert is turned off right now. Use Copy instead." };
  if (insert === "unknown") {
    return { ok: false, error: "Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy." };
  }

  // Only the box this page's last Reply click opened, and only if it is the
  // one the panel wrote for: text for one comment never lands under another.
  const expected = message.expect;
  const target = lastTarget;
  if (
    !target ||
    (expected?.postId && expected.postId !== target.postId) ||
    (expected && "replyToId" in expected && (expected.replyToId ?? null) !== target.replyToId)
  ) {
    return { ok: false, error: "Click Reply under that comment (or on the post) again, then Insert." };
  }

  const box = (): BoxResult | null => {
    const found = findCommentBox(target, usableEditor);
    return found.ok ? found : null;
  };
  const found = await waitFor(box, BOX_WAIT_MS);
  if (!found) {
    // Still no box after the wait: say why.
    const now = findCommentBox(target, usableEditor);
    return now.ok ? { ok: false, error: "Reddit's box isn't ready to type in. Click into it, then Insert." } : now;
  }
  if (!found.ok) return found;
  return typeInto(found.box, message.text, {
    refind: () => {
      const again = findCommentBox(target, usableEditor);
      return again.ok ? again.box : null;
    },
    onWrite: wrote,
    failure: "Reddit's box didn't keep the comment. It's still here in the panel: use Copy, then paste it in.",
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
  if (message?.type === REDDIT_INSERT_MESSAGE_TYPE && typeof message.text === "string") {
    handleInsert(message as InsertRequest)
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep the channel open for the async sendResponse above
  }
}

// ── One live copy per tab ── (see the end of src/content-script.ts)
const INSTANCE_KEY = "__carouselabsRedditContentScript";
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
// Capture phase on document: runs before Reddit's own handlers, which may stop
// the click from bubbling.
document.addEventListener("click", onDocumentClick, true);
