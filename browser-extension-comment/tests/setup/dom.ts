// Polyfills for DOM APIs jsdom does not implement but the content scripts
// depend on. Each one is an approximation, and each is documented so a test
// author knows what it does and does not prove. Anything that needs the real
// behaviour (execCommand into a contenteditable, real layout) is covered by
// the Playwright suite instead.

// Node-environment test files (e.g. the manifest test) have no DOM at all.
if (typeof window !== "undefined") installDomPolyfills();

function installDomPolyfills() {
// innerText: jsdom has none. Real innerText turns <br> and block boundaries
// into newlines; this does the same for <br>, <p>, <div> and <li>, which is
// all the messaging fixtures use.
if (!Object.getOwnPropertyDescriptor(HTMLElement.prototype, "innerText")) {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    configurable: true,
    get(this: HTMLElement) {
      const clone = this.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
      clone.querySelectorAll("p, div, li").forEach((el) => el.append("\n"));
      return clone.textContent ?? "";
    },
    set(this: HTMLElement, value: string) {
      this.textContent = value;
    },
  });
}

// offsetParent: jsdom always returns null (no layout), which would make every
// element look hidden to isRendered(). Approximated as: null when the element
// or an ancestor is hidden with the `hidden` attribute or inline display:none,
// or when it is detached; otherwise non-null.
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
  configurable: true,
  get(this: HTMLElement) {
    if (!this.isConnected || this.hidden || this.style.display === "none") return null;
    for (let el: Element | null = this.parentElement; el; el = el.parentElement) {
      if (el instanceof HTMLElement && (el.hidden || el.style.display === "none")) return null;
    }
    return this.parentElement ?? document.body;
  },
});

// execCommand: absent in jsdom. A stand-in for "insertText" that types at the
// caret the way Chromium does (checked there: the selection is replaced by the
// text, and one `input` event with inputType "insertText" follows), so unit
// tests run the same path real pages take. Any other command does nothing
// and returns false. Tests that need an editor which takes nothing assign
// their own document.execCommand. The real command is tested in Chromium
// (tests/e2e).
if (typeof document.execCommand !== "function") {
  (Document.prototype as unknown as { execCommand: typeof typeAtCaret }).execCommand = typeAtCaret;
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}

// DataTransfer and ClipboardEvent: absent in jsdom. Just enough for a page's
// own paste handler to read the pasted text, as script editors (Draft.js) do.
// A made-up paste does nothing by itself in Chromium either.
if (typeof window.DataTransfer !== "function") {
  class TestDataTransfer {
    private data = new Map<string, string>();
    setData(type: string, value: string) {
      this.data.set(type, value);
    }
    getData(type: string) {
      return this.data.get(type) ?? "";
    }
  }
  (window as unknown as { DataTransfer: unknown }).DataTransfer = TestDataTransfer;
}
if (typeof window.ClipboardEvent !== "function") {
  class TestClipboardEvent extends Event {
    readonly clipboardData: DataTransfer | null;
    constructor(type: string, init: EventInit & { clipboardData?: DataTransfer | null } = {}) {
      super(type, init);
      this.clipboardData = init.clipboardData ?? null;
    }
  }
  (window as unknown as { ClipboardEvent: unknown }).ClipboardEvent = TestClipboardEvent;
}
}

// Works in any document, including a frame's (tests/unit/helpers.ts copies it
// there): no instanceof, and events made by that document's own window.
function typeAtCaret(this: Document, command: string, _ui?: boolean, value = ""): boolean {
  if (command !== "insertText") return false;
  const InputEventOf = (this.defaultView as (Window & typeof globalThis) | null)?.InputEvent ?? InputEvent;
  const active = this.activeElement as HTMLTextAreaElement | null;
  if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
    const start = active.selectionStart ?? active.value.length;
    const end = active.selectionEnd ?? start;
    active.value = active.value.slice(0, start) + value + active.value.slice(end);
    active.setSelectionRange(start + value.length, start + value.length);
    active.dispatchEvent(new InputEventOf("input", { bubbles: true, inputType: "insertText", data: value }));
    return true;
  }
  const selection = this.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  const start = range.startContainer;
  const host = (start.nodeType === Node.ELEMENT_NODE ? (start as Element) : start.parentElement)?.closest(
    '[contenteditable="true"], [contenteditable=""]',
  );
  if (!host) return false;
  range.deleteContents();
  const typed = this.createTextNode(value);
  range.insertNode(typed);
  range.setStartAfter(typed);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  host.dispatchEvent(new InputEventOf("input", { bubbles: true, inputType: "insertText", data: value }));
  return true;
}
