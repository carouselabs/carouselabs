// src/x/content/xEditor.ts — putting text into X's reply box, a Draft.js
// editor. Draft keeps its own copy of the text and redraws the box from it,
// so text written straight into the page (textContent) only LOOKS inserted:
// X drops it on the next keystroke or posts without it. Draft does take the
// browser's own text input (execCommand insertText, which a keystroke also
// produces) and a paste, so those are the only two ways used here; if
// neither lands, Insert reports failure and the person can Copy instead.
// Never clicks Reply.

function landed(box: HTMLElement, text: string): boolean {
  const probe = text.trim().slice(0, 24);
  return probe.length > 0 && (box.textContent ?? "").includes(probe);
}

// The caret at the very end of what's in the box, so the text goes after
// anything already typed (a bare focus() can leave it at the start).
function caretToEnd(box: HTMLElement): void {
  const doc = box.ownerDocument;
  const range = doc.createRange();
  range.selectNodeContents(box);
  range.collapse(false);
  const selection = doc.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export async function insertIntoDraft(box: HTMLElement, text: string): Promise<boolean> {
  const existing = (box.textContent ?? "").trim();
  const toInsert = existing ? ` ${text}` : text;

  box.focus();
  caretToEnd(box);
  const accepted = typeof box.ownerDocument.execCommand === "function" && box.ownerDocument.execCommand("insertText", false, toInsert);
  // Draft applies the input on its next render.
  await nextTick();
  if (accepted && landed(box, text)) return true;

  // A paste, the other way Draft takes text.
  box.focus();
  caretToEnd(box);
  const data = new DataTransfer();
  data.setData("text/plain", toInsert);
  box.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  await nextTick();
  return landed(box, text);
}
