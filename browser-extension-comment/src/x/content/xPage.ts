// src/x/content/xPage.ts — reading posts on x.com, for the X extension's
// content script. Written against saved copies of real X pages
// (tests/fixtures/x): the home feed, a post's own page, the reply pop-up and
// a quote post. X marks its parts with data-testid attributes:
//   article[data-testid="tweet"]   one post
//   [data-testid="User-Name"]      name, @handle and time
//   [data-testid="tweetText"]      the text
//   [data-testid="reply"]          the Reply button
//   div[role="link"]               a quoted post, inside the post quoting it
//   [data-testid="tweetTextarea_0"] the (Draft.js) box you type a post or reply in
// A quoted post's name, text and time come BEFORE the quoting post's own time
// in the page, so everything here reads the post while skipping its quote.
import type { XCapturedPost, XCapturedPostItem } from "@/x/lib/xPost";

const STATUS_PATH = /^\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/;

// "/<handle>/status/<id>" of an x.com address (absolute or relative), or null.
export function statusPath(href: string | null | undefined): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, "https://x.com");
    if (url.hostname !== "x.com" && url.hostname !== "twitter.com") return null;
    const m = STATUS_PATH.exec(url.pathname);
    return m ? `/${m[1]}/status/${m[2]}` : null;
  } catch {
    return null;
  }
}

// The signed-in account's handle, from X's own profile link in the side menu.
export function ownHandle(doc: Document = document): string {
  const href = doc.querySelector('[data-testid="AppTabBar_Profile_Link"]')?.getAttribute("href") ?? "";
  return href.split("/").filter(Boolean).pop() ?? "";
}

// The quoted post inside a post, if any.
function quoteBlock(article: Element): Element | null {
  return [...article.querySelectorAll('div[role="link"]')].find((el) => el.querySelector('[data-testid="User-Name"]')) ?? null;
}

// The first match inside `root` that isn't inside `skip`.
function firstOutside(root: Element, selector: string, skip: Element | null): Element | null {
  return [...root.querySelectorAll(selector)].find((el) => !skip || !skip.contains(el)) ?? null;
}

function textOf(el: Element | null): string {
  if (!el) return "";
  return ((el as HTMLElement).innerText ?? el.textContent ?? "").replace(/ /g, " ").trim();
}

// Name and handle from a User-Name block: the handle is the "@..." span (or
// the profile link), the name the first other text.
function nameAndHandle(userName: Element | null): { author: string; handle: string } {
  if (!userName) return { author: "", handle: "" };
  const spans = [...userName.querySelectorAll("span")]
    .filter((s) => s.children.length === 0)
    .map((s) => (s.textContent ?? "").trim())
    .filter(Boolean);
  const handleText = spans.find((t) => /^@[A-Za-z0-9_]{1,15}$/.test(t));
  const linkHandle = [...userName.querySelectorAll("a[href]")]
    .map((a) => {
      try {
        return new URL(a.getAttribute("href")!, "https://x.com").pathname.split("/").filter(Boolean);
      } catch {
        return [];
      }
    })
    .find((parts) => parts.length === 1)?.[0];
  const author = spans.find((t) => !t.startsWith("@") && t !== "·" && !/^\d+[smhd]$/.test(t)) ?? "";
  return { author, handle: handleText?.slice(1) ?? linkHandle ?? "" };
}

function mediaOf(root: Element, skip: Element | null): string[] {
  const has = (testid: string) => firstOutside(root, `[data-testid="${testid}"]`, skip) !== null;
  const media: string[] = [];
  if (has("videoPlayer") || has("videoComponent")) media.push("video");
  else if (has("tweetPhoto")) media.push("image");
  if (has("card.wrapper")) media.push("link");
  return media;
}

// When the post was published: X's <time datetime>, or "" (ads have none).
export function postedAt(article: Element): string {
  return firstOutside(article, "time", quoteBlock(article))?.getAttribute("datetime") ?? "";
}

// One post, as the panel and the server take it.
export function postFromArticle(article: Element): XCapturedPostItem {
  const quote = quoteBlock(article);
  const { author, handle } = nameAndHandle(firstOutside(article, '[data-testid="User-Name"]', quote));
  const link = [...article.querySelectorAll('a[href*="/status/"]')].find((a) => a.querySelector("time") && !quote?.contains(a));
  const path = statusPath(link?.getAttribute("href"));
  return {
    author,
    handle,
    text: textOf(firstOutside(article, '[data-testid="tweetText"]', quote)),
    url: path ? `https://x.com${path}` : "",
    media: mediaOf(article, quote),
  };
}

function quotedFrom(article: Element): XCapturedPostItem | null {
  const quote = quoteBlock(article);
  if (!quote) return null;
  const { author, handle } = nameAndHandle(quote.querySelector('[data-testid="User-Name"]'));
  // A quoted post shows no link of its own.
  return { author, handle, text: textOf(quote.querySelector('[data-testid="tweetText"]')), url: "", media: mediaOf(quote, null) };
}

// Posts in the page's main column, never the reply pop-up's copy of one.
function timelineArticles(doc: Document): Element[] {
  return [...doc.querySelectorAll('[data-testid="primaryColumn"] article[data-testid="tweet"]')].filter(
    (a) => !a.closest('[role="dialog"]'),
  );
}

// On a post's own page, the post itself (X makes it the one that can't take
// focus); null elsewhere.
export function focalArticle(doc: Document = document): Element | null {
  if (!STATUS_PATH.test(doc.location.pathname)) return null;
  return timelineArticles(doc).find((a) => a.getAttribute("tabindex") === "-1") ?? null;
}

// The conversation above a post: on a post's own page, the posts above the
// main one, plus the main one when replying under it. On the feed, nothing.
function threadFor(article: Element, doc: Document): XCapturedPostItem[] {
  const focal = focalArticle(doc);
  if (!focal) return [];
  const articles = timelineArticles(doc);
  const focalIndex = articles.indexOf(focal);
  const ancestors = articles.slice(0, focalIndex);
  const chain = article === focal ? ancestors : [...ancestors, focal];
  return chain.map(postFromArticle).filter((p) => p.text || p.media.length > 0);
}

export function captureArticle(article: Element, doc: Document = document): XCapturedPost {
  const post = postFromArticle(article);
  const me = ownHandle(doc).toLowerCase();
  return {
    capturedAt: Date.now(),
    post,
    thread: threadFor(article, doc),
    quoted: quotedFrom(article),
    isOwnPost: me && post.handle ? post.handle.toLowerCase() === me : null,
  };
}

// The post a click is replying to: a post's Reply button, or (on a post's own
// page) the "Post your reply" box under it. null for any other click,
// including the box for writing a NEW post on the home feed.
export function replyTargetOfClick(target: Element, doc: Document = document): Element | null {
  const replyButton = target.closest('[data-testid="reply"]');
  if (replyButton) {
    const article = replyButton.closest('article[data-testid="tweet"]');
    return article && !article.closest('[role="dialog"]') ? article : null;
  }
  const composer = target.closest('[data-testid="tweetTextarea_0_label"]');
  if (composer && !composer.closest('[role="dialog"]') && inlineComposerIsReply(doc)) return focalArticle(doc);
  return null;
}

// Whether the main column's inline box replies (a post's own page: its
// button says "Reply") rather than posts (the home feed: "Post").
function inlineComposerIsReply(doc: Document): boolean {
  const button = doc.querySelector('[data-testid="primaryColumn"] [data-testid="tweetButtonInline"]');
  return /^\s*reply\s*$/i.test(button?.textContent ?? "");
}

export type ComposerResult = { ok: true; box: HTMLElement } | { ok: false; error: string };

// The reply box for one post: the reply pop-up showing that post (matched by
// its time, which X shows there too), or the inline box on that post's own
// page. Never the box for a new post.
export function findReplyBox(
  target: { statusPath: string; postedAt: string; handle: string },
  doc: Document = document,
): ComposerResult {
  const dialogs = [...doc.querySelectorAll('[role="dialog"]')].filter((d) => d.querySelector('[data-testid="tweetTextarea_0"]'));
  for (const dialog of dialogs) {
    const shown = dialog.querySelector('article[data-testid="tweet"]');
    if (!shown) continue;
    const sameTime = target.postedAt !== "" && postedAt(shown) === target.postedAt;
    const sameHandle = target.postedAt === "" && postFromArticle(shown).handle.toLowerCase() === target.handle.toLowerCase();
    if (!sameTime && !sameHandle) {
      return { ok: false, error: "This reply was written for a different post. Click Reply on it again, then Insert." };
    }
    const box = dialog.querySelector<HTMLElement>('[data-testid="tweetTextarea_0"]');
    if (box) return { ok: true, box };
  }

  const onItsPage = statusPath(doc.location.href) === target.statusPath;
  if (onItsPage && inlineComposerIsReply(doc)) {
    const box = doc.querySelector<HTMLElement>('[data-testid="primaryColumn"] [data-testid="tweetTextarea_0"]');
    if (box) return { ok: true, box };
  }
  return { ok: false, error: "Couldn't find X's reply box. Click Reply on the post, then Insert." };
}
