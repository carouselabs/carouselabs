// src/content/messageThread.ts — LinkedIn conversation reading and reply
// insertion for the Conversation Assistant, used by src/content-script.ts
// alongside its Comment/Reply/Connect flows.
//
// Selectors marked "confirmed" were copied from live LinkedIn captures; the
// rest are structural guesses. Tests: tests/unit/messageThread.test.ts and
// tests/e2e against tests/fixtures/linkedin/messaging-*.html.
//
// The two failure modes this file is built around are the serious ones:
//   1. Text written for one person landing in another person's box.
//   2. Telling the model the user said something the contact said (or the
//      reverse), which makes it write in the wrong person's voice.
// So everything here prefers "unknown" or a refusal over a guess.
//
// Reading happens on demand, when the side panel asks
// (READ_CONVERSATION_MESSAGE_TYPE) — a conversation has no click that means
// "start here".

import { getSelfName, normalizeName } from "@/content/replyThread";
import { insertTextAtEnd } from "@/content/editor";
import type {
  CapturedConversation,
  ConversationContact,
  MessageInsertExpectation,
  MessageThreadEntry,
} from "@/lib/messageThread";

type Sender = MessageThreadEntry["sender"];

function collapse(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function ownText(el: Element): string {
  return collapse(
    Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join(" "),
  );
}

// LinkedIn's floating chat pop-ups (bottom-right, present on every page) hold
// OTHER conversations, and can be expanded while a thread is open on the
// Messaging page. Confirmed live: "msg-overlay-bubble-header__…". Their
// containers are "msg-overlay-container" / "msg-overlay-conversation-bubble",
// which the earlier "overlay-bubble" match missed — so a pop-up's messages
// were read into the open thread.
function isInOverlay(el: Element): boolean {
  return el.closest('[class*="msg-overlay" i], [class*="overlay-bubble" i]') !== null;
}

// LinkedIn keeps a previously open conversation mounted but hidden when you
// switch threads (confirmed live: Emma's old messages were read into Bharti's
// thread). offsetParent is null for display:none content and its descendants.
function isRendered(el: Element): boolean {
  return (el as HTMLElement).offsetParent !== null;
}

function isLive(el: Element): boolean {
  return !isInOverlay(el) && isRendered(el);
}

export function isMessagingPage(): boolean {
  return /^\/messaging(\/|$)/.test(window.location.pathname);
}

// LinkedIn's newer page design renders Messaging inside a full-screen frame
// laid over its new shell (confirmed live: <iframe data-testid="interop-iframe"
// src="/preload/?_bprMode=vanilla">). The outer page then holds only a hidden
// feed, and the conversation — still in the classic markup this file reads —
// is inside the frame. It is same-origin, so it is read directly. The URL
// that says which thread is open is still the outer page's.
const INTEROP_FRAME_SELECTOR = 'iframe[data-testid="interop-iframe"]';

function frameDocuments(): Document[] {
  const docs: Document[] = [];
  for (const frame of Array.from(document.querySelectorAll<HTMLIFrameElement>(INTEROP_FRAME_SELECTOR))) {
    try {
      if (frame.contentDocument) docs.push(frame.contentDocument);
    } catch {
      // Not same-origin: not LinkedIn's Messaging frame, nothing to read.
    }
  }
  return docs;
}

// Where the open conversation lives: the page itself (classic design) or
// LinkedIn's Messaging frame (new design). The page wins whenever it shows a
// thread itself, so the classic design behaves exactly as before.
export function messagingDocument(): Document {
  if (openThreadTitle(document)) return document;
  return frameDocuments().find((doc) => openThreadTitle(doc)) ?? document;
}

// A thread that exists but isn't on screen — seen live in the Messaging frame
// when the tab is narrow (the side panel takes width), where LinkedIn shows
// only the conversation list. Worth its own message: "no conversation is
// open" is wrong when the user just clicked one.
function hasHiddenThread(): boolean {
  return [document, ...frameDocuments()].some((doc) =>
    Array.from(doc.querySelectorAll(".msg-entity-lockup__entity-title")).some((el) => !isInOverlay(el) && !isRendered(el)),
  );
}

// Loose name match: equal, or one is a whole-word part of the other
// ("Anant" in "Anant Goyal"; "Tom Brook" in the group title "Priya Shah, Tom
// Brook"). Emoji, accents, case and punctuation are ignored.
function namesOverlap(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return ` ${long} `.includes(` ${short} `);
}

// ── Messages ──

// Confirmed: each message's text is a <p class="msg-s-event-listitem__body">.
// The rest are unconfirmed guesses. There is deliberately no bare
// "[role='listitem']" fallback: feed posts are role="listitem" too, and it
// once pulled feed posts into a thread.
const MESSAGE_ITEM_SELECTORS = [
  ".msg-s-event-listitem__body",
  "[data-view-name*='message-bubble' i]",
  "[data-view-name*='message-list-item' i]",
  "[componentkey*='message' i][componentkey*='bubble' i]",
  "li[componentkey*='message' i]",
];

function findMessageItems(doc: Document): Element[] {
  for (const selector of MESSAGE_ITEM_SELECTORS) {
    const items = Array.from(doc.querySelectorAll(selector)).filter(isLive);
    if (items.length > 0) return items;
  }
  return [];
}

// The longest of: the item's own full rendered text, or any nested text
// element. The full text normally wins — an edited message renders its
// "(Edited)" tag as its own nested element, which must not replace the
// message. innerText, not textContent, so <br> line breaks become spaces
// instead of gluing words together.
function messageTextOf(item: Element): string {
  const candidates = Array.from(item.querySelectorAll("p, span, div"))
    .map((el) => ownText(el))
    .filter((text) => text.length > 1 && !/^[\d:/, ]+(AM|PM)?$/i.test(text));
  // Not `instanceof HTMLElement`: an element inside LinkedIn's Messaging frame
  // belongs to the frame's window, so that check would always fail for it.
  const fallback = collapse((item as HTMLElement).innerText ?? item.textContent);
  const best = candidates.sort((a, b) => b.length - a.length)[0] ?? "";
  return best.length > fallback.length ? best : fallback;
}

// ── Senders ──
//
// Confirmed: consecutive messages from one person follow a header row with a
// <time class="msg-s-message-group__timestamp">, a link to the sender's
// profile and their name. That row is NOT an ancestor of the messages, so
// each message takes the sender of the nearest preceding row, in page order.
//
// Each row is resolved by NAME first (contact vs the signed-in user), then by
// profile URL, and otherwise left unknown. The earlier rule — "a link that
// isn't the contact's must be the user's" — inverted every message whenever
// the contact's URL came out wrong, and called every other participant of a
// group chat "me".

const SENDER_ROW_MARKER = "[class*='msg-s-message-group__timestamp']";
const SENDER_NAME_SELECTOR = "[class*='msg-s-message-group__name']";
const VIEW_PROFILE_PATTERN = /^View\s+(.+?)['’]s\s+profile\s*/i;

function normalizeProfileUrl(href: string | null | undefined): string {
  if (!href) return "";
  try {
    return new URL(href, window.location.origin).pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return (href.split("?")[0] ?? "").replace(/\/+$/, "").toLowerCase();
  }
}

interface SenderRow {
  marker: Element;
  name: string;
  url: string;
  sender: Sender;
}

// The smallest ancestor of the timestamp that carries the sender's link or
// name, without growing into the messages themselves.
function senderRowOf(marker: Element): Element {
  let row: Element = marker.parentElement ?? marker;
  for (let depth = 0; depth < 3; depth += 1) {
    if (row.querySelector(`${SENDER_NAME_SELECTOR}, a[href*="/in/"]`)) return row;
    const parent = row.parentElement;
    if (!parent || parent.querySelector(MESSAGE_ITEM_SELECTORS[0])) return row;
    row = parent;
  }
  return row;
}

function senderNameOf(row: Element): string {
  const named = collapse(row.querySelector(SENDER_NAME_SELECTOR)?.textContent);
  if (named) return named;
  const linkText = collapse(row.querySelector('a[href*="/in/"]')?.textContent);
  const view = linkText.match(VIEW_PROFILE_PATTERN);
  if (!view) return linkText;
  // "View Anant’s profileAnant Goyal" → "Anant Goyal"; the a11y text alone
  // still gives the first name.
  return collapse(linkText.slice(view[0].length)) || view[1];
}

function resolveByName(name: string, contactName: string, selfName: string): Sender {
  const isContact = namesOverlap(name, contactName);
  const isSelf = namesOverlap(name, selfName);
  if (isSelf && !isContact) return "me";
  if (isContact && !isSelf) return "them";
  return "unknown";
}

function isGroupTitle(contactName: string): boolean {
  return contactName.includes(",");
}

interface SenderAttribution {
  senders: Map<Element, Sender>;
  // A profile URL known to be the contact's, when one could be established.
  contactUrl: string;
}

function attributeSenders(
  doc: Document,
  items: Element[],
  contact: { name: string; headerUrl: string },
  selfName: string,
): SenderAttribution {
  const rows: SenderRow[] = Array.from(doc.querySelectorAll(SENDER_ROW_MARKER))
    .filter(isLive)
    .map((marker) => {
      const row = senderRowOf(marker);
      const name = senderNameOf(row);
      return {
        marker,
        name,
        url: normalizeProfileUrl(row.querySelector<HTMLAnchorElement>('a[href*="/in/"]')?.href),
        sender: resolveByName(name, contact.name, selfName),
      };
    });

  // What the name pass established about each profile URL. A URL claimed by
  // both sides is ambiguous and is not used.
  const byUrl = new Map<string, Sender>();
  for (const row of rows) {
    if (!row.url || row.sender === "unknown") continue;
    const known = byUrl.get(row.url);
    byUrl.set(row.url, known && known !== row.sender ? "unknown" : row.sender);
  }

  // The header's link is only the contact's if nothing says it's the user's.
  let contactUrl = contact.headerUrl && byUrl.get(contact.headerUrl) !== "me" ? contact.headerUrl : "";
  const group = isGroupTitle(contact.name);
  const distinctUrls = new Set(rows.map((r) => r.url).filter(Boolean));
  if (!contactUrl && !group) {
    const theirs = [...byUrl].filter(([, sender]) => sender === "them").map(([url]) => url);
    if (theirs.length === 1) contactUrl = theirs[0];
  }

  for (const row of rows) {
    if (row.sender !== "unknown" || !row.url) continue;
    const known = byUrl.get(row.url);
    if (known && known !== "unknown") row.sender = known;
    else if (contactUrl && row.url === contactUrl) row.sender = "them";
    // A 1:1 thread has exactly two people: once one URL is known to be the
    // contact's, the only other one is the user's. Never applied to groups.
    else if (contactUrl && !group && distinctUrls.size === 2) row.sender = "me";
  }

  const ordered = [
    ...items.map((el) => ({ el, row: null as SenderRow | null })),
    ...rows.map((row) => ({ el: row.marker, row })),
  ].sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

  const senders = new Map<Element, Sender>();
  let current: Sender = "unknown";
  for (const { el, row } of ordered) {
    if (row) current = row.sender;
    else senders.set(el, current);
  }
  return { senders, contactUrl: group ? "" : contactUrl };
}

// ── Contact ──

// Confirmed: the headline is a class-less element whose title attribute
// echoes its own text (the truncation tooltip).
function findHeadlineNear(anchor: Element, excludeText: string): string {
  let scope: Element | null = anchor;
  for (let depth = 0; depth < 6 && scope; depth += 1) {
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>("[title]"))) {
      const title = collapse(el.getAttribute("title"));
      if (!title || title !== collapse(el.textContent)) continue;
      if (title.length < 5 || title.length > 300 || namesOverlap(title, excludeText)) continue;
      return title;
    }
    scope = scope.parentElement;
  }
  return "";
}

// A profile link in the thread header. Stops before its scope reaches the
// messages — past that point the first /in/ link is a message sender's (the
// user's own, usually), which is how the contact's URL used to come out as
// the user's.
function findHeaderProfileLink(title: Element): string {
  let scope: Element | null = title;
  for (let depth = 0; depth < 6 && scope; depth += 1) {
    if (scope.querySelector(`${MESSAGE_ITEM_SELECTORS[0]}, ${SENDER_ROW_MARKER}`)) return "";
    const link = scope.querySelector<HTMLAnchorElement>('a[href*="/in/"]');
    if (link) return normalizeProfileUrl(link.href);
    scope = scope.parentElement;
  }
  return "";
}

// Confirmed: the open thread's header name is h2.msg-entity-lockup__entity-title.
// There is no page-title or avatar fallback any more: on Messaging, the page
// title is "Messaging" (it was once read as the contact's name), and avatar
// alt text also appears in the conversation list, for other people.
function openThreadTitle(doc: Document): Element | null {
  return Array.from(doc.querySelectorAll(".msg-entity-lockup__entity-title")).find(isLive) ?? null;
}

function extractContact(doc: Document): { name: string; headline: string; headerUrl: string; strategy: string } {
  const title = openThreadTitle(doc);
  const name = collapse(title?.textContent);
  if (!title || !name) return { name: "", headline: "", headerUrl: "", strategy: "none" };
  return {
    name,
    headline: findHeadlineNear(title, name),
    headerUrl: findHeaderProfileLink(title),
    strategy: "entity-lockup-title",
  };
}

export interface ConversationExtraction {
  result: CapturedConversation;
  strategies: { contact: string; itemsFound: number; senderRows: number };
}

export async function extractConversation(): Promise<ConversationExtraction> {
  const doc = messagingDocument();
  const found = extractContact(doc);
  // The name in LinkedIn's nav: the outer page's, else the Messaging frame's
  // own nav, else the cached one (getSelfName falls back to it).
  let self = await getSelfName();
  if (self.source !== "page" && doc !== document) {
    const fromFrame = await getSelfName(doc);
    if (fromFrame.source === "page") self = fromFrame;
  }
  const items = findMessageItems(doc);
  const { senders, contactUrl } = attributeSenders(doc, items, found, self.name);

  const contact: ConversationContact = { name: found.name, headline: found.headline, profileUrl: contactUrl };
  const thread: MessageThreadEntry[] = items
    .map((item) => ({ sender: senders.get(item) ?? "unknown", text: messageTextOf(item) }))
    .filter((entry) => entry.text);

  return {
    result: { contact, thread, capturedAt: Date.now(), threadPath: window.location.pathname },
    strategies: {
      contact: doc === document ? found.strategy : `${found.strategy} (messaging frame)`,
      itemsFound: items.length,
      senderRows: doc.querySelectorAll(SENDER_ROW_MARKER).length,
    },
  };
}

// The panel's Read action: refuses unless a conversation is actually open on
// the full Messaging page.
export async function readConversation(): Promise<{ ok: boolean; conversation?: CapturedConversation; error?: string }> {
  if (!isMessagingPage()) {
    return { ok: false, error: "Open the conversation on LinkedIn's Messaging page (not a chat pop-up), then try again." };
  }
  const extraction = await extractConversation();
  if (import.meta.env.MODE !== "production") logConversationDiagnostics(extraction, messagingDocument());
  if (!extraction.result.contact.name) {
    if (hasHiddenThread()) {
      return {
        ok: false,
        error:
          "LinkedIn is showing only your chat list right now, so the conversation isn't visible. Make the LinkedIn window wider (or open the chat so it fills the page), then try again.",
      };
    }
    return { ok: false, error: "No conversation is open. Pick a conversation on the left, then try again." };
  }
  return { ok: true, conversation: extraction.result };
}

// ── Compose box ──

// Confirmed: div.msg-form__contenteditable. Only the open thread's box is
// eligible — never a chat pop-up's or a hidden thread's.
const COMPOSE_BOX_SELECTORS = [
  "div.msg-form__contenteditable",
  "[data-view-name*='message-compose' i] [contenteditable='true']",
  "[contenteditable='true'][aria-label*='Write a message' i]",
];

function findComposeBox(doc: Document): HTMLElement | null {
  for (const selector of COMPOSE_BOX_SELECTORS) {
    const box = Array.from(doc.querySelectorAll<HTMLElement>(selector)).find(isLive);
    if (box) return box;
  }
  return null;
}

// Fills the open conversation's message box — only if it is still the
// conversation the text was written for. Never clicks Send.
export function insertIntoComposeBox(
  text: string,
  expected: MessageInsertExpectation | undefined,
): { ok: boolean; error?: string } {
  if (!expected?.threadPath || !expected.contactName) {
    return { ok: false, error: "Click \"Re-read this conversation\", then Insert." };
  }
  const doc = messagingDocument();
  const openName = extractContact(doc).name;
  if (window.location.pathname !== expected.threadPath || normalizeName(openName) !== normalizeName(expected.contactName)) {
    return {
      ok: false,
      error: `This was written for ${expected.contactName}, but ${openName ? `${openName}'s conversation` : "a different page"} is open now. Go back to ${expected.contactName}'s conversation, or re-read this one.`,
    };
  }

  const box = findComposeBox(doc);
  if (!box) {
    return { ok: false, error: "Couldn't find the message box in this conversation. Click into it, then try Insert." };
  }
  insertTextAtEnd(box, text);
  return { ok: true };
}

// ── Development diagnostics (never runs in production builds) ──

function logConversationDiagnostics(extraction: ConversationExtraction, doc: Document) {
  const self = collapse(document.querySelector("header img[alt], nav img[alt]")?.getAttribute("alt"));
  const rows = Array.from(doc.querySelectorAll(SENDER_ROW_MARKER)).map((marker) => {
    const row = senderRowOf(marker);
    return {
      live: isLive(marker),
      name: senderNameOf(row),
      url: normalizeProfileUrl(row.querySelector<HTMLAnchorElement>('a[href*="/in/"]')?.href),
      outerHTML: row.outerHTML.slice(0, 300),
    };
  });
  console.log(
    `[DIAG message] ${window.location.pathname} — nav name: "${self}" — reading ${doc === document ? "the page" : "LinkedIn's messaging frame"}`,
  );
  console.log("[DIAG message] extraction (copyable):\n" + JSON.stringify(extraction, null, 2));
  console.log("[DIAG message] sender rows (copyable):\n" + JSON.stringify(rows, null, 2));
}
