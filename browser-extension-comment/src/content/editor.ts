// src/content/editor.ts — shared by every Insert into a LinkedIn
// contenteditable editor (comment, reply, DM compose).
//
// Places text AFTER anything already in the box. A bare focus() leaves the
// caret at the start in Chromium (verified: inserting into a box holding
// "Love this." produced "INSERTEDLove this."), which glued generated text
// onto the front of a draft the user had typed. Never clicks Post or Send.

// The innermost last container of the editor — for "<p>Love this.</p>" that
// is the <p>, so the caret lands inside the user's text, not after its block.
function lastContainer(box: HTMLElement): Node {
  let node: Node = box;
  while (node.lastChild instanceof Element && node.lastChild.tagName !== "BR") node = node.lastChild;
  return node;
}

export function insertTextAtEnd(box: HTMLElement, text: string): void {
  box.focus();

  const existing = box.textContent ?? "";
  const hasDraft = existing.trim().length > 0;
  const toInsert = hasDraft && !/\s$/.test(existing) ? ` ${text}` : text;

  if (hasDraft) {
    const range = document.createRange();
    range.selectNodeContents(lastContainer(box));
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  // execCommand is deprecated but is still the one way to fill a
  // framework-owned editor with the same input events a keystroke produces,
  // so LinkedIn's editor keeps the text instead of discarding it on render.
  if (document.execCommand("insertText", false, toInsert)) return;

  // Fallback for editors where execCommand is blocked: append, never replace,
  // so a draft survives.
  if (hasDraft) lastContainer(box).appendChild(document.createTextNode(toInsert));
  else box.textContent = toInsert;
  box.dispatchEvent(new InputEvent("input", { bubbles: true, data: toInsert, inputType: "insertText" }));
}
