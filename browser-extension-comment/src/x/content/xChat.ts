// src/x/content/xChat.ts — reading an X chat (DM) and filling its message
// box. Written against layouts of X's real Chat saved with the dev-only tool
// (src/x/content/devSnapshot.ts; test pages in tests/fixtures/x):
//   x.com/i/chat/<id>                         an open chat
//   [data-testid="xchatEmbedRoute"]           hosts the Chat in an open shadow root
//   [data-testid="dm-conversation-header"]    the person: a link to x.com/<handle>
//   [data-testid="dm-conversation-username"]  their name
//   [data-testid="message-<id>"][data-dm-message-row]  one message; its row is
//       laid out "justify-end" when you sent it and "justify-start" when they did
//   [data-testid="message-text-<id>"]         its text
//   textarea[data-testid="dm-composer-textarea"]       the message box
// Nothing is read until the person clicks Read in the panel.

export interface XChatMessage {
  sender: "me" | "them" | "unknown";
  text: string;
}

export interface XConversation {
  contact: { name: string; handle: string; profileUrl: string };
  // "/i/chat/<id>": which chat this was, so Insert goes back to it.
  threadPath: string;
  thread: XChatMessage[];
}

const CHAT_PATH = /^\/i\/chat\/[^/]+\/?$/;

export function isChatPage(doc: Document = document): boolean {
  return CHAT_PATH.test(doc.location.pathname);
}

// The Chat's root: X's open shadow root (or, should it close it, the one
// chrome.dom can still reach).
export function chatRoot(doc: Document = document): ParentNode | null {
  const host = doc.querySelector<HTMLElement>('[data-testid="xchatEmbedRoute"]');
  if (!host) return null;
  if (host.shadowRoot) return host.shadowRoot;
  try {
    return chrome.dom?.openOrClosedShadowRoot(host) ?? host;
  } catch {
    return host;
  }
}

function contactOf(root: ParentNode): XConversation["contact"] {
  const header = root.querySelector('[data-testid="dm-conversation-header"]');
  const link = header?.querySelector("a[href]")?.getAttribute("href") ?? "";
  let handle = "";
  try {
    const parts = new URL(link, "https://x.com").pathname.split("/").filter(Boolean);
    if (parts.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(parts[0])) handle = parts[0];
  } catch {
    // no link: name only
  }
  const nameEl = root.querySelector('[data-testid="dm-conversation-username"]');
  const name = (nameEl?.querySelector("div div")?.textContent ?? nameEl?.textContent ?? "").trim();
  return { name, handle, profileUrl: handle ? `https://x.com/${handle}` : "" };
}

function messageText(row: Element): string {
  const text = row.querySelector('[data-testid^="message-text-"]');
  // The words only, not the time X tucks in beside them.
  const words = text?.querySelector('span[dir="auto"]') ?? text;
  return (words?.textContent ?? "").replace(/ /g, " ").trim();
}

function senderOf(row: Element): XChatMessage["sender"] {
  if (row.classList.contains("justify-end")) return "me";
  if (row.classList.contains("justify-start")) return "them";
  return "unknown";
}

export type ReadResult = { ok: true; conversation: XConversation } | { ok: false; error: string };

export function readChat(doc: Document = document): ReadResult {
  if (!isChatPage(doc)) return { ok: false, error: "Open a chat on X (Messages), then try again." };
  const root = chatRoot(doc);
  if (!root) return { ok: false, error: "Couldn't find X's chat on this page. Let it finish loading, then try again." };
  const contact = contactOf(root);
  if (!contact.name && !contact.handle) {
    return { ok: false, error: "No conversation is open. Pick a chat on the left, then try again." };
  }
  const rows = [...root.querySelectorAll('[data-testid^="message-"][data-dm-message-row]')].filter(
    (row) => !row.getAttribute("data-testid")!.startsWith("message-text-"),
  );
  const thread = rows
    .map((row) => ({ sender: senderOf(row), text: messageText(row) }))
    .filter((m) => m.text !== "");
  return { ok: true, conversation: { contact, threadPath: doc.location.pathname.replace(/\/$/, ""), thread } };
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

// Puts `text` in the chat's message box, after anything already typed, the
// way typing would (so X's own code sees it). Only in the chat it was
// written for; never sends.
export async function insertIntoChat(
  text: string,
  expected: { threadPath?: string; handle?: string } | undefined,
  doc: Document = document,
): Promise<{ ok: boolean; error?: string }> {
  if (!expected?.threadPath) return { ok: false, error: 'Click "Re-read this conversation", then Insert.' };
  const here = doc.location.pathname.replace(/\/$/, "");
  const root = chatRoot(doc);
  const open = root ? contactOf(root) : null;
  if (here !== expected.threadPath.replace(/\/$/, "") || (expected.handle && open?.handle && open.handle !== expected.handle)) {
    return {
      ok: false,
      error: "This was written for another chat. Go back to that chat, or re-read this one.",
    };
  }
  const box = root?.querySelector<HTMLTextAreaElement>('textarea[data-testid="dm-composer-textarea"]');
  if (!box) return { ok: false, error: "Couldn't find the message box in this chat. Click into it, then try Insert." };

  const existing = box.value;
  const toInsert = existing.trim() ? `${/\s$/.test(existing) ? "" : " "}${text}` : text;
  box.focus();
  box.setSelectionRange(existing.length, existing.length);
  const typed = typeof doc.execCommand === "function" && doc.execCommand("insertText", false, toInsert);
  await nextTick();
  if (typed && box.value.includes(text.trim().slice(0, 24))) return { ok: true };

  // X's box is a React-controlled textarea: set the value through the
  // element's own setter, then tell React it changed.
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(box), "value")?.set;
  setter?.call(box, existing + toInsert);
  box.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  return box.value.includes(text.trim().slice(0, 24))
    ? { ok: true }
    : { ok: false, error: "Couldn't type into X's message box. Use Copy instead." };
}
