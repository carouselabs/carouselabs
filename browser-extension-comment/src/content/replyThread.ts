// src/content/replyThread.ts — Reply-button detection and comment-thread
// extraction, used by src/content-script.ts alongside its post Comment flow.
//
// A "Reply" control sits under each individual comment and is a different
// element from the post's main Comment button. Clicking one means the user
// wants to answer a specific comment, so the useful context is the post plus
// the whole thread that comment belongs to, in reading order, with the reply
// target marked.
//
// Verified against live LinkedIn on the main feed and on /posts/<slug>
// permalink pages. Comment items are found through commentItemSelector from
// /api/ext/config (componentkeys naming each comment's URN). No class names
// anywhere — LinkedIn hashes them per build.

// Name helpers live in content-script.ts with the post flow; passed in rather
// than imported, since content-script.ts runs side effects on load and must
// not be imported, and moving them would churn the verified post code.
export interface NameHelpers {
  nameFromProfileLink(link: Element): string;
  ownText(el: Element): string;
}

export interface ThreadEntry {
  authorName: string;
  text: string;
  // LinkedIn's own id for this comment ("activity:X,Y"), when the
  // componentkey strategy found it. Stable across re-renders.
  commentUrn: string | null;
  // 0 for a top-level comment, 1+ for replies nested under it.
  depth: number;
  isTarget: boolean;
  // null when either name is unknown, so "not you" and "can't tell" differ.
  isSelf: boolean | null;
  isPostAuthor: boolean | null;
  // Which heuristic found the text: "testid" is the post body's own anchor
  // reused; "walk" is the unanchored fallback and may include UI chrome.
  textStrategy: "testid" | "walk" | "none";
}

export interface ExtractedThread {
  entries: ThreadEntry[];
  // Every comment item found in scope, not just this thread's. Returned so the
  // caller can check whether a "post text" match actually sits in a comment.
  allItems: Element[];
  itemStrategy: "componentkey" | "heuristic";
  // The clicked comment and the outermost comment of its thread. Insert uses
  // them to find that comment's reply box; null when extraction failed.
  targetItem: Element | null;
  rootItem: Element | null;
}

// LinkedIn labels the control "Reply" (text) and, on some builds, "Reply to
// <name>'s comment" (aria-label). Anchored at the start so "Replies" and
// "Load previous replies" never match.
const REPLY_LABEL_PATTERN = /^reply\b/i;

export function findReplyButton(target: Element): Element | null {
  const control = target.closest("button, [role='button']");
  if (!control) return null;

  const label = control.getAttribute("aria-label")?.trim() ?? "";
  const text = (control.textContent ?? "").replace(/\s+/g, " ").trim();
  return REPLY_LABEL_PATTERN.test(label) || REPLY_LABEL_PATTERN.test(text) ? control : null;
}

// ── Comment items ──
//
// Primary: LinkedIn's componentkeys name each comment's URN
// ("replaceableComment_urn:li:comment:(activity:X,Y)"), and one comment has
// several such wrappers at different depths. So items are keyed by URN, not
// by depth: every ancestor carrying the SAME URN is another wrapper of the
// same comment and collapses into the outermost one, while an ancestor with a
// DIFFERENT URN is the parent comment — which is exactly the nesting the
// thread grouping below needs.

const COMMENT_URN_PATTERN = /urn:li:comment:\(([^)]*)\)?/;

export function commentUrn(el: Element): string | null {
  return el.getAttribute("componentkey")?.match(COMMENT_URN_PATTERN)?.[1] ?? null;
}

// The outermost wrapper of el's own comment, stopping at the first ancestor
// that names a different comment (el's parent, if el is a reply).
function canonicalItem(el: Element, scope: Element, itemSelector: string): Element {
  const urn = commentUrn(el);
  let top = el;
  for (let p = el.parentElement; p && p !== scope && scope.contains(p); p = p.parentElement) {
    if (!p.matches(itemSelector)) continue;
    const other = commentUrn(p);
    if (urn === null || other !== urn) break;
    top = p;
  }
  return top;
}

function componentkeyItems(scope: Element, itemSelector: string): Element[] {
  const items: Element[] = [];
  for (const match of Array.from(scope.querySelectorAll(itemSelector))) {
    const item = canonicalItem(match, scope, itemSelector);
    if (!items.includes(item)) items.push(item);
  }
  return items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

function componentkeyItemFor(replyButton: Element, scope: Element, itemSelector: string): Element | null {
  const nearest = replyButton.closest(itemSelector);
  return nearest && scope.contains(nearest) ? canonicalItem(nearest, scope, itemSelector) : null;
}

// Fallback only, used when nothing in scope matches the componentkey selector
// (LinkedIn changed the keys): the nearest ancestor of a Reply control that
// also holds a profile link — the commenter's.
function heuristicItemFor(replyButton: Element, scope: Element, profileHrefSelector: string): Element | null {
  let el = replyButton.parentElement;
  while (el && scope.contains(el) && el !== scope) {
    if (el.querySelector(profileHrefSelector)) return el;
    el = el.parentElement;
  }
  return null;
}

function isInsideAny(node: Node, containers: Element[]): boolean {
  return containers.some((c) => c !== node && c.contains(node));
}

function authorOf(item: Element, nested: Element[], profileHrefSelector: string, helpers: NameHelpers): string {
  // The first link is often the avatar, which carries no text of its own, so
  // walk on until one yields a plausible name.
  for (const link of Array.from(item.querySelectorAll(profileHrefSelector))) {
    if (isInsideAny(link, nested)) continue;
    const name = helpers.nameFromProfileLink(link);
    if (name) return name;
  }
  return "";
}

function textOf(
  item: Element,
  nested: Element[],
  postTextSelector: string,
  profileHrefSelector: string,
): Pick<ThreadEntry, "text" | "textStrategy"> {
  // Comments may reuse the post body's text anchor; if so, it's the best hook.
  const anchored = Array.from(item.querySelectorAll(postTextSelector)).find((el) => !isInsideAny(el, nested));
  if (anchored) {
    const clone = anchored.cloneNode(true) as Element;
    clone.querySelectorAll("button").forEach((b) => b.remove());
    const text = clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (text) return { text, textStrategy: "testid" };
  }

  // Fallback: every text node that isn't a nested reply, a control, the
  // commenter's own link, or a timestamp. Can still pick up the headline.
  const skip = (node: Node) => {
    const parent = node.parentElement;
    if (!parent) return true;
    if (isInsideAny(node, nested)) return true;
    return Boolean(parent.closest(`button, [role='button'], time, ${profileHrefSelector}`));
  };

  const parts: string[] = [];
  const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (skip(node)) continue;
    const text = node.textContent?.replace(/\s+/g, " ").trim();
    if (text) parts.push(text);
  }

  const text = parts.join(" ").trim();
  return { text, textStrategy: text ? "walk" : "none" };
}

// Names compared loosely: accents, case, punctuation and spacing vary between
// the nav avatar's alt text and a profile link's label.
function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sameName(a: string, b: string): boolean | null {
  if (!a || !b) return null;
  return normalizeName(a) === normalizeName(b);
}

export function extractThread(
  replyButton: Element,
  scope: Element,
  selectors: { commentItemSelector: string; profileHrefSelector: string; postTextSelector: string },
  names: { postAuthor: string; self: string },
  helpers: NameHelpers,
): ExtractedThread {
  const { commentItemSelector, profileHrefSelector, postTextSelector } = selectors;

  // Every comment item in scope, in document order (the order LinkedIn
  // renders them on screen).
  let allItems = componentkeyItems(scope, commentItemSelector);
  let targetItem = componentkeyItemFor(replyButton, scope, commentItemSelector);
  let itemStrategy: ExtractedThread["itemStrategy"] = "componentkey";

  if (allItems.length === 0) {
    itemStrategy = "heuristic";
    allItems = [];
    for (const control of Array.from(scope.querySelectorAll("button, [role='button']"))) {
      if (findReplyButton(control) !== control) continue;
      const item = heuristicItemFor(control, scope, profileHrefSelector);
      if (item && !allItems.includes(item)) allItems.push(item);
    }
    targetItem = heuristicItemFor(replyButton, scope, profileHrefSelector);
  }

  if (!targetItem) return { entries: [], allItems, itemStrategy, targetItem: null, rootItem: null };

  // The thread root is the outermost item containing the target. If LinkedIn
  // nests replies inside their parent comment, this yields the whole thread;
  // if it renders them as siblings, the diagnostics will show a one-entry
  // thread and this needs a different grouping rule.
  const root =
    allItems.filter((item) => item.contains(targetItem)).sort((a, b) => (a.contains(b) ? -1 : 1))[0] ??
    targetItem;

  const members = allItems.filter((item) => root.contains(item));
  const entries = members.map((item): ThreadEntry => {
    const nested = allItems.filter((other) => other !== item && item.contains(other));
    const depth = members.filter((other) => other !== item && other.contains(item)).length;
    const authorName = authorOf(item, nested, profileHrefSelector, helpers);

    return {
      authorName,
      commentUrn: commentUrn(item),
      ...textOf(item, nested, postTextSelector, profileHrefSelector),
      depth,
      isTarget: item === targetItem,
      isSelf: sameName(authorName, names.self),
      isPostAuthor: sameName(authorName, names.postAuthor),
    };
  });

  return { entries, allItems, itemStrategy, targetItem, rootItem: root };
}

// ── Signed-in user's display name ──
//
// Read from LinkedIn's own page chrome: the global nav's "Me" avatar is an
// <img> whose alt text is the member's name. Cached in chrome.storage.local
// so a page where the nav hasn't rendered (or a layout without it) still has
// an answer, and refreshed every time the nav yields one, so switching
// LinkedIn accounts corrects itself on the next read.

const SELF_NAME_STORAGE_KEY = "linkedinSelfName";

const SELF_CHROME_SCOPES = "header, nav, [role='banner'], [role='navigation']";

// Alt text sometimes wraps the name ("Photo of Jane Doe", "Jane Doe's
// profile photo"); stripped so what's left can be compared to a link name.
function nameFromAlt(alt: string): string {
  return alt
    .replace(/^photo of\s+/i, "")
    .replace(/['’]s?\s+(profile\s+)?(photo|picture)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NAME_LIKE = /^\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*)+$/u;

// Every image in the page chrome, with why it was or wasn't accepted as the
// member's name. Accepted entries drive getSelfName; the reasons exist so an
// empty result can be diagnosed rather than guessed at.
interface SelfNameCandidate {
  alt: string;
  name: string;
  accepted: boolean;
  reason: string;
  scope: string;
  parentLabel: string | null;
}

function inspectSelfNameChrome(): { scopesFound: number; candidates: SelfNameCandidate[] } {
  const scopes = document.querySelectorAll(SELF_CHROME_SCOPES);
  const candidates: SelfNameCandidate[] = [];

  for (const img of Array.from(document.querySelectorAll<HTMLImageElement>(`:is(${SELF_CHROME_SCOPES}) img`))) {
    const alt = img.getAttribute("alt") ?? "";
    const name = nameFromAlt(alt);
    const reason = !img.hasAttribute("alt")
      ? "no alt attribute"
      : !alt.trim()
        ? "empty alt"
        : name.length > 50
          ? "longer than 50 chars"
          : !NAME_LIKE.test(name)
            ? "not name-shaped (needs 2+ capitalised words)"
            : "ok";

    candidates.push({
      alt,
      name,
      accepted: reason === "ok",
      reason,
      scope: img.closest(SELF_CHROME_SCOPES)?.tagName.toLowerCase() ?? "",
      parentLabel: img.closest("button, a")?.getAttribute("aria-label") ?? null,
    });
  }

  return { scopesFound: scopes.length, candidates };
}

export type SelfNameSource = "page" | "cache" | "none";

export async function getSelfName(): Promise<{ name: string; source: SelfNameSource; reason: string }> {
  const { scopesFound, candidates } = inspectSelfNameChrome();
  const fromPage = candidates.find((c) => c.accepted)?.name ?? "";
  if (fromPage) {
    chrome.storage.local
      .set({ [SELF_NAME_STORAGE_KEY]: { name: fromPage, capturedAt: Date.now() } })
      .catch((err) => console.warn("[content-script] failed to cache LinkedIn name:", err));
    return { name: fromPage, source: "page", reason: "nav avatar alt text" };
  }

  // Said once here so the console explains a null isOwnPost without the
  // diagnostic dump: which stage failed, not just that it did.
  const pageReason =
    scopesFound === 0
      ? "no header/nav element on the page"
      : candidates.length === 0
        ? `${scopesFound} header/nav element(s) but no images inside them`
        : `${candidates.length} nav image(s), none name-shaped (${[...new Set(candidates.map((c) => c.reason))].join("; ")})`;

  try {
    const stored = (await chrome.storage.local.get(SELF_NAME_STORAGE_KEY))[SELF_NAME_STORAGE_KEY];
    if (stored && typeof stored.name === "string" && stored.name) {
      return { name: stored.name, source: "cache", reason: `cached; page lookup failed: ${pageReason}` };
    }
  } catch (err) {
    console.warn("[content-script] failed to read cached LinkedIn name:", err);
  }

  console.warn(`[content-script] couldn't determine your LinkedIn name: ${pageReason}; nothing cached either.`);
  return { name: "", source: "none", reason: `${pageReason}; nothing cached` };
}


