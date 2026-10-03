// DEVELOPMENT BUILDS ONLY (src/x/content-script.ts imports it behind a
// MODE check, so store builds never contain it). Ctrl+Alt+Shift+S on an X
// page downloads the page's LAYOUT for building the extension against it,
// with every word of text replaced: letters become "x" and digits "0", so no
// message, name or handle is ever saved. It reaches what "Save page as"
// can't: X's Chat, which sits in shadow roots (including closed ones, via
// chrome.dom) or frames.

// Attributes worth keeping for layout. Their values are scrubbed too.
const KEEP = /^(data-[\w-]+|role|aria-[\w-]+|class|contenteditable|tabindex|dir|type|href|src|placeholder|name|id|slot|part)$/;

const scrub = (text: string) => text.replace(/\p{L}/gu, "x").replace(/\p{N}/gu, "0");
// Attribute values keep their shape (a class name is no one's name, but an
// aria-label or href can be), so only the long free-text ones are scrubbed.
const scrubAttr = (name: string, value: string) =>
  name === "class" || name === "role" || name === "dir" || name === "type" || name === "contenteditable" || name === "tabindex" || name === "slot" || name === "part"
    ? value
    : name === "data-testid"
      ? value.replace(/\d{5,}/g, "0")
      : scrub(value);

function shadowOf(el: Element): ShadowRoot | null {
  if (el.shadowRoot) return el.shadowRoot;
  try {
    return chrome.dom?.openOrClosedShadowRoot(el as HTMLElement) ?? null;
  } catch {
    return null;
  }
}

function serialize(node: Node, depth = 0): string {
  if (depth > 400) return "";
  if (node.nodeType === Node.TEXT_NODE) return scrub(node.textContent ?? "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  // Dropped, but as a closed pair: "<style/>" isn't self-closing in HTML, so
  // the parser would read the rest of the page as CSS.
  if (tag === "script" || tag === "style" || tag === "svg" || tag === "img" || tag === "video" || tag === "link") return `<${tag}></${tag}>`;
  const attrs = [...el.attributes]
    .filter((a) => KEEP.test(a.name))
    .map((a) => ` ${a.name}="${scrubAttr(a.name, a.value).replace(/"/g, "&quot;")}"`)
    .join("");
  let inner = "";
  const shadow = shadowOf(el);
  if (shadow) inner += `<template shadowrootmode="${el.shadowRoot ? "open" : "closed"}">${[...shadow.childNodes].map((c) => serialize(c, depth + 1)).join("")}</template>`;
  if (tag === "iframe") {
    try {
      const doc = (el as HTMLIFrameElement).contentDocument;
      inner += doc ? `<!-- frame (same origin) -->${serialize(doc.documentElement, depth + 1)}` : `<!-- frame (other origin): ${scrub(el.getAttribute("src") ?? "")} -->`;
    } catch {
      inner += "<!-- frame (not readable) -->";
    }
  }
  inner += [...el.childNodes].map((c) => serialize(c, depth + 1)).join("");
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

function download() {
  const html = `<!doctype html><!-- X page layout, text scrubbed. Saved from ${location.pathname.replace(/[^/]+/g, (s) => (/^\d+$/.test(s) ? "0" : s.length > 2 ? "x" : s))} -->\n${serialize(document.documentElement)}`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `x-layout-${location.pathname.startsWith("/messages") || location.pathname.startsWith("/i/chat") ? "dm" : "page"}-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  console.log("[x-content-script] page layout saved (text scrubbed)");
}

export function listenForLayoutShortcut(): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.altKey && event.shiftKey && event.code === "KeyS") {
      event.preventDefault();
      download();
    }
  };
  document.addEventListener("keydown", onKey, true);
  return () => document.removeEventListener("keydown", onKey, true);
}

export const serializeForTest = serialize;
