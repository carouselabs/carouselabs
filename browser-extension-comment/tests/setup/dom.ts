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

// execCommand: absent in jsdom. Returning false makes production code take its
// documented fallback path (set text + dispatch input), which is what unit
// tests exercise. The execCommand path itself is tested in real Chromium.
if (typeof document.execCommand !== "function") {
  (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
}

if (typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}
}
