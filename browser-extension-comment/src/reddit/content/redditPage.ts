// src/reddit/content/redditPage.ts — reading posts and comments on new Reddit
// (www.reddit.com), for the Reddit extension's content script. Written
// against saved copies of real Reddit pages (tests/fixtures/reddit). Reddit
// builds its pages from web components that carry what we need as
// attributes:
//   shreddit-post            post-title, author, author-id, user-id (the
//                            signed-in account), subreddit-prefixed-name,
//                            post-type, permalink, id "t3_…"
//   #<t3_…>-post-rtjson-content      the post's text
//   shreddit-comment         thingid "t1_…", parentid (the comment above it),
//                            depth, author, permalink
//   #<t1_…>-comment-rtjson-content   a comment's text
//   faceplate-tracker[noun="reply_comment"]   a comment's Reply button
//   faceplate-textarea-input[data-testid="trigger-button"]  "Join the
//                            conversation", which opens the box for the post
//   comment-composer-host    an open box: post-id, and parent-id for a reply
//   summary[aria-controls="rule-…"] h2 + #rule-…   the subreddit's rules
import type { RedditCapturedItem, RedditCapturedPost, RedditCapturedTarget } from "@/reddit/lib/redditPost";

const BLOCKS = new Set(["P", "PRE", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "TABLE"]);
const LISTS = new Set(["UL", "OL"]);

// An element's text with its paragraphs and list items on their own lines,
// the way the person reads it (textContent runs paragraphs together).
export function blockText(el: Element | null | undefined): string {
  if (!el) return "";
  const parts: string[] = [];
  const walk = (node: Element) => {
    for (const child of [...node.children]) {
      if (BLOCKS.has(child.tagName)) parts.push(child.textContent ?? "");
      else if (LISTS.has(child.tagName)) {
        for (const li of child.querySelectorAll(":scope > li")) parts.push(`- ${li.textContent ?? ""}`);
      } else if (child.querySelector("p, pre, blockquote, ul, ol, h1, h2, h3, h4, h5, h6, table")) walk(child);
      else if (child.textContent?.trim()) parts.push(child.textContent);
    }
  };
  walk(el);
  if (parts.length === 0) parts.push(el.textContent ?? "");
  return parts
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

const attr = (el: Element, name: string) => el.getAttribute(name)?.trim() ?? "";

// A reddit.com address for a path the page gives ("/r/…/comments/…").
function absolute(path: string): string {
  if (!path) return "";
  try {
    const url = new URL(path, "https://www.reddit.com");
    return url.hostname === "www.reddit.com" ? `https://www.reddit.com${url.pathname}` : "";
  } catch {
    return "";
  }
}

// The post this page is about (its comments page), or the first one shown.
export function mainPost(doc: Document = document): Element | null {
  return doc.querySelector('shreddit-post[view-context="CommentsPage"]') ?? doc.querySelector("shreddit-post");
}

export function postFromElement(post: Element, doc: Document = document): RedditCapturedPost {
  const id = attr(post, "id");
  const body = id ? doc.querySelector(`[id="${id}-post-rtjson-content"]`) : null;
  return {
    title: attr(post, "post-title"),
    author: attr(post, "author"),
    text: blockText(body),
    url: absolute(attr(post, "permalink")),
    flair: (post.querySelector("shreddit-post-flair")?.textContent ?? "").replace(/\s+/g, " ").trim(),
    kind: attr(post, "post-type") || "text",
  };
}

export function commentFromElement(comment: Element): RedditCapturedItem {
  const id = attr(comment, "thingid");
  return {
    author: attr(comment, "author"),
    text: blockText(id ? comment.querySelector(`[id="${id}-comment-rtjson-content"]`) : null),
    url: absolute(attr(comment, "permalink")),
  };
}

// A comment by its id ("t1_" and letters or digits; anything else isn't one).
function commentById(id: string, doc: Document): Element | null {
  return /^t1_[a-z0-9]+$/i.test(id) ? doc.querySelector(`shreddit-comment[thingid="${id}"]`) : null;
}

// The comments above one, top-level first (as far as the page has them).
export function commentChain(comment: Element, doc: Document = document): RedditCapturedItem[] {
  const chain: RedditCapturedItem[] = [];
  let parent = commentById(attr(comment, "parentid"), doc);
  while (parent && chain.length < 20) {
    chain.unshift(commentFromElement(parent));
    parent = commentById(attr(parent, "parentid"), doc);
  }
  return chain.filter((c) => c.text);
}

// The post's first top-level comments in the page's order (Reddit's sort).
export function topComments(doc: Document = document, limit = 5): RedditCapturedItem[] {
  return [...doc.querySelectorAll('shreddit-comment[depth="0"]')]
    .map(commentFromElement)
    .filter((c) => c.text)
    .slice(0, limit);
}

// The subreddit's rules from its sidebar: each a title and, collapsed or not,
// its full text.
export function subredditRules(doc: Document = document): { title: string; text: string }[] {
  const seen = new Set<string>();
  const rules: { title: string; text: string }[] = [];
  for (const summary of doc.querySelectorAll('summary[aria-controls^="rule-"]')) {
    const title = (summary.querySelector("h2")?.textContent ?? "").replace(/\s+/g, " ").trim();
    const text = blockText(doc.getElementById(summary.getAttribute("aria-controls") ?? ""));
    const key = `${title}\n${text}`;
    if (!title || seen.has(key)) continue;
    seen.add(key);
    rules.push({ title, text });
  }
  return rules;
}

// What a click means: Reply under a comment (or clicking into its open reply
// box), or the box for commenting on the post. null for any other click.
// `path` is the click's composed path, which reaches inside Reddit's
// components.
export type RedditClickTarget = { kind: "comment"; comment: Element } | { kind: "post" };

export function replyTargetOfClick(path: EventTarget[], doc: Document = document): RedditClickTarget | null {
  const elements = path.filter((t): t is Element => typeof (t as Element).getAttribute === "function");
  const comment = elements.find((el) => el.tagName === "SHREDDIT-COMMENT") ?? null;

  const replyButton = elements.find(
    (el) => el.getAttribute("noun") === "reply_comment" || el.getAttribute("slot") === "comment-reply",
  );
  if (replyButton && comment) return { kind: "comment", comment };

  const host = elements.find((el) => el.tagName === "COMMENT-COMPOSER-HOST");
  if (host) {
    const parent = attr(host, "parent-id");
    if (!parent) return { kind: "post" };
    const replied = commentById(parent, doc);
    return replied ? { kind: "comment", comment: replied } : null;
  }

  const opener = elements.find(
    (el) =>
      (el.tagName === "FACEPLATE-TEXTAREA-INPUT" && el.getAttribute("data-testid") === "trigger-button") ||
      (el.tagName === "SHREDDIT-ASYNC-LOADER" && el.getAttribute("bundlename") === "comment_composer"),
  );
  if (opener && !comment) return { kind: "post" };
  return null;
}

// Everything the panel and the server need about one click's target.
export function captureTarget(target: RedditClickTarget, doc: Document = document): RedditCapturedTarget | null {
  const post = mainPost(doc);
  if (!post) return null;
  const userId = attr(post, "user-id");
  const authorId = attr(post, "author-id");
  const replyTo = target.kind === "comment" ? commentFromElement(target.comment) : null;
  return {
    capturedAt: Date.now(),
    subreddit: attr(post, "subreddit-prefixed-name"),
    rules: subredditRules(doc),
    post: postFromElement(post, doc),
    postId: attr(post, "id"),
    replyTo,
    replyToId: target.kind === "comment" ? attr(target.comment, "thingid") : null,
    chain: target.kind === "comment" ? commentChain(target.comment, doc) : [],
    others: target.kind === "post" ? topComments(doc) : [],
    isOwnPost: userId && authorId ? userId === authorId : null,
  };
}

// ── Insert ──────────────────────────────────────────────────────────────

// Every element under `root`, including inside components' shadow roots
// (open ones directly; closed ones through chrome.dom, which content scripts
// may use), where Reddit keeps the box you type in.
function* deepElements(root: ParentNode, depth = 0): Generator<Element> {
  if (depth > 30) return;
  for (const el of root.querySelectorAll("*")) {
    yield el;
    let shadow: ShadowRoot | null = el.shadowRoot;
    if (!shadow) {
      try {
        shadow = chrome.dom?.openOrClosedShadowRoot(el as HTMLElement) ?? null;
      } catch {
        shadow = null;
      }
    }
    if (shadow) yield* deepElements(shadow, depth + 1);
  }
}

export type BoxResult = { ok: true; box: HTMLElement } | { ok: false; error: string };

// The open box for one target: the reply box under that very comment, or the
// box for commenting on that post. Never another comment's box.
export function findCommentBox(
  target: Pick<RedditCapturedTarget, "postId" | "replyToId">,
  isEditable: (el: Element) => el is HTMLElement,
  doc: Document = document,
): BoxResult {
  const hosts = [...doc.querySelectorAll("comment-composer-host")];
  const host = target.replyToId
    ? hosts.find((h) => attr(h, "parent-id") === target.replyToId)
    : hosts.find((h) => !attr(h, "parent-id") && (!target.postId || attr(h, "post-id") === target.postId));
  if (!host) {
    return {
      ok: false,
      error: target.replyToId
        ? "Couldn't find the reply box under that comment. Click Reply under it, then Insert."
        : "Couldn't find Reddit's comment box. Click \"Join the conversation\" on the post, then Insert.",
    };
  }
  // Reddit's box is a rich-text editor (contenteditable) or, in Markdown
  // mode, a textarea; never the composer's other fields (hidden inputs, the
  // file picker for images).
  for (const el of deepElements(host)) {
    const kind = el.tagName === "TEXTAREA" || ["true", "", "plaintext-only"].includes(el.getAttribute("contenteditable") ?? "-");
    if (kind && isEditable(el)) return { ok: true, box: el };
  }
  return { ok: false, error: "Reddit's box isn't ready to type in. Click into it, then Insert." };
}
