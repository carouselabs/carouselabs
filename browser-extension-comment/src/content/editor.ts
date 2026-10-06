// src/content/editor.ts — putting text into a site's own editor, shared by
// every Insert: LinkedIn's comment, reply and message boxes, and X's reply
// box (src/x/content/xEditor.ts).
//
// The text goes AFTER anything already in the box: a draft the person typed
// while waiting, or the @mention LinkedIn pre-fills in a reply box. A bare
// focus() can leave the caret at the start in Chromium (verified: inserting
// into a box holding "Love this." produced "INSERTEDLove this."), so the caret
// is always put at the end first. Never clicks Post or Send.
//
// Sites' editors keep their own copy of the text (React state, Draft.js,
// Quill...) and redraw the box from it, so text that is only written into
// the page LOOKS inserted but is dropped on the next keystroke or posted
// without it. They take the browser's own text input — execCommand
// insertText, which fires the same trusted `input` event a keystroke does
// (checked in Chromium) — and their own paste handling, so those are the only
// two ways used. Success is only reported once the box holds the text, and
// still holds it after the editor's next redraw.

// Text as an editor may show it: block breaks instead of "\n", non-breaking
// spaces for runs of spaces, and emoji drawn as pictures (X) that may not be
// in the box's text at all. Compared without whitespace or emoji, so a
// two-line reply still matches the two paragraphs it became.
const SPACES = /[\s ​-‍﻿]+/g;
const EMOJI = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}‍︎️⃣]/gu;

export function comparable(text: string): string {
  return text.normalize("NFC").replace(EMOJI, "").replace(SPACES, "");
}

function isTextField(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
  // tagName rather than instanceof: a box inside LinkedIn's Messaging frame
  // belongs to the frame's window, where instanceof fails.
  return el.tagName === "TEXTAREA" || el.tagName === "INPUT";
}

export function boxText(box: Element): string {
  return isTextField(box) ? box.value : (box.textContent ?? "");
}

// Whether the box holds `text`, added to what it held `before`.
export function holdsText(box: Element, text: string, before = ""): boolean {
  const want = comparable(text);
  // Only emoji: anything new in the box counts.
  if (!want) return boxText(box) !== before;
  const now = comparable(boxText(box));
  return now.includes(want) && now.length >= comparable(before).length + want.length;
}

// A box the person could type into right now: on the page, editable, and
// not hidden (display: none on it or a parent; a closed thread, a collapsed
// section).
export function usableEditor(el: Element | null | undefined): el is HTMLElement {
  if (!el?.isConnected) return false;
  const html = el as HTMLElement;
  if (isTextField(el)) {
    if (el.disabled || el.readOnly) return false;
  } else {
    const flag = el.getAttribute("contenteditable");
    if (html.isContentEditable !== true && flag !== "true" && flag !== "" && flag !== "plaintext-only") return false;
  }
  if (el.closest("[hidden]")) return false;
  // Chrome 105+; jsdom has no layout, and treats everything as shown.
  return typeof html.checkVisibility === "function" ? html.checkVisibility() : true;
}

// The innermost last container of the editor — for "<p>Love this.</p>" that
// is the <p>, so the caret lands inside the person's text, not after its
// block. Checked in Chromium: an empty "<p><br></p>" (or Draft.js's empty
// line) then takes the text in place of its placeholder <br>.
function lastContainer(box: HTMLElement): Node {
  let node: Node = box;
  while (node.lastChild?.nodeType === Node.ELEMENT_NODE && (node.lastChild as Element).tagName !== "BR") {
    node = node.lastChild;
  }
  return node;
}

function caretToEnd(box: HTMLElement): void {
  if (isTextField(box)) {
    box.setSelectionRange(box.value.length, box.value.length);
    return;
  }
  const doc = box.ownerDocument;
  const range = doc.createRange();
  range.selectNodeContents(lastContainer(box));
  range.collapse(false);
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

// What to type so the text reads well after what is there: a space between
// it and a draft that doesn't end in one.
function withSeparator(box: HTMLElement, text: string): string {
  const existing = boxText(box);
  return existing.trim() && !/\s$/.test(existing) ? ` ${text}` : text;
}

// The browser's own text input, as a keystroke makes it. Returns whether the
// browser ran it (not yet whether the editor kept it).
function typeAtEnd(box: HTMLElement, toInsert: string): boolean {
  box.focus();
  caretToEnd(box);
  const doc = box.ownerDocument;
  return typeof doc.execCommand === "function" && doc.execCommand("insertText", false, toInsert);
}

// A paste: the other way script editors (Draft.js, Quill) take text. The
// browser itself does nothing with a made-up paste, so this only lands where
// the page's own code handles it.
function pasteAtEnd(box: HTMLElement, toInsert: string): void {
  // The box's own window: a frame's box takes only its frame's events.
  const win = (box.ownerDocument.defaultView ?? window) as Window & typeof globalThis;
  if (typeof win.DataTransfer !== "function" || typeof win.ClipboardEvent !== "function") return;
  box.focus();
  caretToEnd(box);
  const data = new win.DataTransfer();
  data.setData("text/plain", toInsert);
  box.dispatchEvent(new win.ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
}

// Replaces everything in the box with `text`, the way selecting all and
// typing would (so the editor sees it, and Ctrl+Z in the box brings the old
// text back). Returns whether the browser ran it.
export function typeReplacing(box: HTMLElement, text: string): boolean {
  box.focus();
  if (isTextField(box)) {
    box.select();
  } else {
    const range = box.ownerDocument.createRange();
    range.selectNodeContents(box);
    const selection = box.ownerDocument.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
  const doc = box.ownerDocument;
  return typeof doc.execCommand === "function" && doc.execCommand("insertText", false, text);
}

// Lets the editor finish redrawing from its own copy of the text: one frame,
// then the rest of that task. Bounded, in case frames aren't running.
export function settle(box: HTMLElement): Promise<void> {
  const win = box.ownerDocument.defaultView ?? window;
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      win.setTimeout(resolve, 0);
    };
    win.requestAnimationFrame?.(finish);
    win.setTimeout(finish, 100);
  });
}

export type TypeResult = { ok: true } | { ok: false; error: string };

export interface TypeIntoOptions {
  // The box again, should the editor have replaced it while redrawing.
  refind?: () => HTMLElement | null;
  // What to tell the person when the editor didn't keep the text.
  failure: string;
  // Called just before the box is first changed: from then on, a second try
  // of the same Insert could double the text (src/lib/insertOnce.ts).
  onWrite?: () => void;
}

// A React-controlled text field takes a new value through the element's own
// value setter followed by an input event (setting .value directly is
// overwritten on React's next render).
function setFieldValue(field: HTMLTextAreaElement | HTMLInputElement, value: string): void {
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

// Types `text` at the end of `box` and confirms the editor took it and kept
// it. Tries the browser's own input, then — only if nothing at all changed,
// so the text can never land twice — a text field's own value setter, or a
// paste for a script editor.
export async function typeInto(box: HTMLElement, text: string, options: TypeIntoOptions): Promise<TypeResult> {
  const before = boxText(box);
  const toInsert = withSeparator(box, text);
  options.onWrite?.();

  typeAtEnd(box, toInsert);
  if (!holdsText(box, text, before) && comparable(boxText(box)) === comparable(before)) {
    if (isTextField(box)) setFieldValue(box, before + toInsert);
    else pasteAtEnd(box, toInsert);
  }

  await settle(box);
  const current = box.isConnected ? box : (options.refind?.() ?? null);
  if (current && holdsText(current, text, before)) return { ok: true };
  return { ok: false, error: options.failure };
}
