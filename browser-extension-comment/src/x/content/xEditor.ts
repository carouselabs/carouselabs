// src/x/content/xEditor.ts — putting text into X's reply box, a Draft.js
// editor. Draft keeps its own copy of the text and redraws the box from it,
// so text written straight into the page (textContent) only LOOKS inserted:
// X drops it on the next keystroke or posts without it. Draft does take the
// browser's own text input (execCommand insertText, which a keystroke also
// produces) and a paste, so those are the only two ways used
// (src/content/editor.ts); if neither lands, Insert reports failure and the
// person can Copy instead. Never clicks Reply.
//
// Draft shows a reply's lines as separate blocks, so the box's text has no
// line breaks: the check that the reply landed ignores them. (It used to look
// for the first 24 characters, line break included, so a reply with a short
// first line looked missing and was pasted in a second time.)
import { typeInto, type TypeResult } from "@/content/editor";

export function insertIntoDraft(
  box: HTMLElement,
  text: string,
  options: { refind?: () => HTMLElement | null; onWrite?: () => void } = {},
): Promise<TypeResult> {
  return typeInto(box, text, {
    ...options,
    failure: "X's reply box didn't keep the reply. It's still here in the panel: use Copy, then paste it in.",
  });
}
