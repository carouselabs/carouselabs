// src/content-script.ts — injected into linkedin.com (see
// manifest.config.ts's content_scripts entry for this file). Watches every
// click on the page for LinkedIn's per-post Comment button; when one fires,
// walks up to that post's container, extracts what we can about the post,
// and hands it to the side panel (see sendPostToSidePanel for why that goes
// through chrome.storage as well as chrome.runtime.sendMessage).
//
// Selector strings all come from GET /api/ext/config (app/api/ext/config/route.ts)
// rather than being hardcoded here, so a LinkedIn DOM change can be patched
// server-side without an extension redeploy.
//
// The post-container selector is attribute-based, not class-based, and that
// is deliberate: LinkedIn serves per-build hashed class names
// ("_83f42d93_f5"), so anything keyed on a class breaks on their next
// deploy. role="listitem" + componentkey^="update-card-focus" was confirmed
// against the live DOM as matching exactly one post.
//
// If clicks stop producing a post, open THIS page's devtools console (not
// the side panel's): a container miss logs a single explicit warning naming
// the selector that failed.

import { getApiBaseUrl } from "@/lib/api";

// Must match MESSAGE_TYPE in src/sidepanel/components/screens/HomeScreen.tsx
// exactly — no shared package between the content script and sidepanel
// bundles' message contract beyond this literal (same reasoning as
// MESSAGE_TYPE in src/background.ts / src/content/authRelay.ts).
const MESSAGE_TYPE = "carouselabs:post-selected";

// Must likewise match LAST_POST_STORAGE_KEY in HomeScreen.tsx. chrome
// .storage is the reliable half of the hand-off: chrome.runtime.sendMessage
// is fire-and-forget and is dropped outright if no extension page happens to
// be listening at that instant, whereas a stored value persists and
// chrome.storage.onChanged fires in every extension context.
const LAST_POST_STORAGE_KEY = "lastSelectedPost";

type PostType = "text" | "image" | "article" | "poll" | "repost";

interface ExtensionConfig {
  commentButtonSelector: string;
  postContainerSelector: string;
  authorProfileHrefSelector: string;
  authorLinkSelector: string;
  authorHeaderSelector: string;
  postTextSelector: string;
  imageIndicatorSelector: string;
  articleIndicatorSelector: string;
  pollIndicatorSelector: string;
  repostIndicatorSelector: string;
  insertEnabled: boolean;
}

// Used only if /api/ext/config can't be reached (offline, backend down) so
// the content script still does *something* rather than going fully dark.
// Kept in sync with app/api/ext/config/route.ts's defaults by hand — there's
// no shared package to import them from.
const FALLBACK_CONFIG: ExtensionConfig = {
  commentButtonSelector: "button[aria-label^='Comment'], button.comment-button",
  postContainerSelector: "div[role='listitem'][componentkey^='update-card-focus']",
  authorProfileHrefSelector: 'a[href*="/in/"], a[href*="/company/"]',
  authorLinkSelector: `a[aria-label^="View "][aria-label$="'s profile"]`,
  authorHeaderSelector: "[componentkey^='feed-header']",
  postTextSelector: '[data-testid="expandable-text-box"]',
  imageIndicatorSelector: ".update-components-image",
  articleIndicatorSelector: ".update-components-article",
  pollIndicatorSelector: ".update-components-poll",
  repostIndicatorSelector:
    ".update-components-mini-update-v2, .feed-shared-reshared-update-v2, .update-components-actor--reshared",
  insertEnabled: true,
};

interface SelectedPost {
  authorName: string;
  authorHeadline: string;
  text: string;
  type: PostType;
  url: string;
  capturedAt: number;
}

console.log("[content-script] loaded on", window.location.href);

// Fetched once and cached for the life of this content script instance (a
// fresh LinkedIn page load re-injects the script and re-fetches) — the spec
// calls for "cache in memory for the session", not persisted anywhere.
let configPromise: Promise<ExtensionConfig> | null = null;

async function loadConfig(): Promise<ExtensionConfig> {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/ext/config`);
  if (!res.ok) throw new Error(`/api/ext/config responded ${res.status}`);
  return (await res.json()) as ExtensionConfig;
}

function getConfig(): Promise<ExtensionConfig> {
  if (!configPromise) {
    configPromise = loadConfig().catch((err) => {
      console.warn("[content-script] failed to load /api/ext/config, using fallback selectors:", err);
      return FALLBACK_CONFIG;
    });
  }
  return configPromise;
}

// Kick the fetch off immediately on script load rather than waiting for the
// first click, so the common case (config already cached by the time a user
// clicks Comment) doesn't pay fetch latency on the click path.
void getConfig();

// LinkedIn's "…see more" is a CSS line-clamp toggle, not a lazy-load: the
// full post text is already in the DOM at click time, alongside the
// clickable "…see more"/"…see less" toggle control living INSIDE the same
// text container. Clone the container and strip out that control's own
// label text before reading textContent, or the toggle's label would get
// appended onto the extracted post text.
function extractPostText(container: Element, selector: string): string {
  const el = container.querySelector(selector);
  if (!el) return "";

  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll("button").forEach((toggle) => toggle.remove());
  return clone.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

// Text this element holds itself, ignoring text belonging to its children —
// so the element that actually renders a string can be told apart from every
// wrapper above it, which would otherwise report the same content.
function ownText(el: Element): string {
  return Array.from(el.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Must stay in step with authorLinkSelector in app/api/ext/config/route.ts,
// which matches on the same "View …'s profile" wording. Both apostrophe
// forms are accepted because the typographic one is a silent-failure risk if
// LinkedIn ever switches.
const AUTHOR_LABEL_PATTERN = /^View\s+(.+?)['’]s\s+profile$/;

// Shared by both link-based author strategies, which differ only in how they
// select candidates (href pattern vs aria-label wording).
//
// A repost contains two profile links — the resharer's, then the original
// author's — so rather than taking the first or last in the container, take
// the last one that still precedes the post text. On a normal post there is
// only one and it precedes the text anyway; on a repost this lands on the
// original author; and it can never pick up a commenter's link, since those
// render after the post body.
function findLastLinkBeforeText(
  container: Element,
  selector: string,
  postTextSelector: string,
): Element | null {
  const links = Array.from(container.querySelectorAll(selector));
  if (links.length === 0) return null;

  const textEl = container.querySelector(postTextSelector);
  if (!textEl) return links.at(-1) ?? null;

  const beforeText = links.filter(
    (link) => textEl.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_PRECEDING,
  );

  return beforeText.at(-1) ?? links.at(-1) ?? null;
}

// LinkedIn appends follow state and degree to profile-link text ("Dr. Rachna
// Jain • Following", "… • 3rd+ • Follow"), and for screen readers sometimes
// repeats the name verbatim inside the same link.
const LINK_SUFFIX_PATTERN = /\s*[•·|]\s*(Following|Follow|1st|2nd|3rd\+?)\s*$/i;

function cleanLinkName(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();

  // Looped because a link can carry more than one of these at once.
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(LINK_SUFFIX_PATTERN, "").trim();
  }

  // Collapse an exactly-repeated name ("NameName") back to a single copy.
  const half = text.length / 2;
  if (text.length > 0 && text.length % 2 === 0 && text.slice(0, half) === text.slice(half)) {
    text = text.slice(0, half).trim();
  }

  return text;
}

function extractNameFromProfileLink(link: Element): string {
  const fromText = cleanLinkName(link.textContent ?? "");
  if (isPlausibleName(fromText)) return fromText;

  // The link itself carries no usable text — icon-only, or its label lives
  // on a nested <svg>. Fall back to a name-shaped span in its wrapper.
  const wrapper = link.parentElement;
  return wrapper ? pickNameLike(collectNameCandidates(wrapper)) : "";
}

// A person's name is short; a line of post body is not. This is what lets
// both fallback strategies below tell one from the other.
const AUTHOR_NAME_MAX_LENGTH = 50;

// Generic UI chrome that renders exactly where a name would. Lives here
// rather than in /api/ext/config because it tracks LinkedIn's copy, not its
// DOM, and only the guess-based tiers consult it.
const NON_NAME_LABELS = new Set([
  "feed post",
  "sponsored",
  "promoted",
  "ad",
  "advertisement",
  "suggested",
  "suggested post",
  "follow",
  "following",
  "recommended for you",
]);

// A real first+last name: two or more words, each starting with a capital.
// Unicode-aware so accented and non-Latin names are not rejected. This is
// what separates "Ankita Dwivedi" from "Feed post", whose second word is
// lowercase.
const NAME_LIKE_PATTERN = /^\p{Lu}[\p{L}'’.-]*(?:\s+\p{Lu}[\p{L}'’.-]*)+$/u;

function isPlausibleName(text: string): boolean {
  return (
    text.length > 0 &&
    text.length <= AUTHOR_NAME_MAX_LENGTH &&
    !NON_NAME_LABELS.has(text.toLowerCase())
  );
}

function collectNameCandidates(
  root: Element,
  accept: (el: Element) => boolean = () => true,
): string[] {
  const candidates: string[] = [];

  for (const el of Array.from(root.querySelectorAll("span"))) {
    if (!accept(el)) continue;

    const text = ownText(el);
    if (!isPlausibleName(text) || candidates.includes(text)) continue;

    candidates.push(text);
  }

  return candidates;
}

// Prefer a name-shaped candidate; fall back to the first surviving one so a
// mononymous or unusually-cased name still gets picked up.
function pickNameLike(candidates: string[]): string {
  return candidates.find((candidate) => NAME_LIKE_PATTERN.test(candidate)) ?? candidates[0] ?? "";
}

type AuthorStrategy =
  | "href"
  | "aria-label"
  | "componentkey"
  | "structural"
  | "structural-rejected"
  | "none";

// LinkedIn renders the author differently per post type, so this tries three
// anchors in descending order of trustworthiness. The strategy that won is
// returned alongside the name so a caller (and the console) can tell a solid
// attribute match apart from a structural guess.
function extractAuthor(
  container: Element,
  config: ExtensionConfig,
  postText: string,
): { name: string; strategy: AuthorStrategy; link: Element | null } {
  // 1. Profile-link href. The most universal anchor: an /in/ or /company/
  //    URL is present even on links whose aria-label is empty because the
  //    label sits on a nested <svg> instead.
  const hrefLink = findLastLinkBeforeText(
    container,
    config.authorProfileHrefSelector,
    config.postTextSelector,
  );
  const fromHref = hrefLink ? extractNameFromProfileLink(hrefLink) : "";
  if (fromHref) return { name: fromHref, strategy: "href", link: hrefLink };

  // 2. aria-label on a profile link, for markup where the href pattern is
  //    absent but the label wording is present.
  const link = findLastLinkBeforeText(container, config.authorLinkSelector, config.postTextSelector);
  const fromLabel = link?.getAttribute("aria-label")?.match(AUTHOR_LABEL_PATTERN)?.[1]?.trim() ?? "";
  if (fromLabel) return { name: fromLabel, strategy: "aria-label", link };

  // 3. componentkey-anchored author header, for post types that render the
  //    name as bare text with no aria-label or href of its own.
  const header = container.querySelector(config.authorHeaderSelector);
  const fromHeader = header ? pickNameLike(collectNameCandidates(header)) : "";
  if (fromHeader) return { name: fromHeader, strategy: "componentkey", link: null };

  // 4. Last resort: a short span before the post body. Genuinely less
  //    reliable than either anchor above — it can pick up a timestamp or a
  //    badge — but beats returning nothing on a post type LinkedIn gives us
  //    no stable hook for.
  const textEl = container.querySelector(config.postTextSelector);
  const fromStructure = pickNameLike(
    collectNameCandidates(container, (el) =>
      textEl
        ? Boolean(textEl.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)
        : true,
    ),
  );
  if (!fromStructure) return { name: "", strategy: "none", link: null };

  // This tier is a guess, so require corroboration: many creators sign off
  // with their own name ("follow Ankita Dwivedi for more"). If the guess
  // appears nowhere in the body, drop it — a wrong name steers comment
  // generation worse than a missing one does.
  //
  // Deliberately scoped to this tier alone. Most posts never mention their
  // author, so applying it to the attribute-anchored tiers above would
  // blank out correct names on the majority of posts.
  const corroborated = postText.toLowerCase().includes(fromStructure.toLowerCase());

  return corroborated
    ? { name: fromStructure, strategy: "structural", link: null }
    : { name: "", strategy: "structural-rejected", link: null };
}

// Best effort only — the headline has no stable anchor, so this takes the
// first text-bearing element following the author link inside its immediate
// wrapper. Returns "" rather than guessing wildly: author and post text are
// what actually matter for generating a comment.
function extractHeadlineNear(authorLink: Element | null, authorName: string): string {
  const wrapper = authorLink?.parentElement?.parentElement;
  if (!authorLink || !wrapper) return "";

  for (const el of Array.from(wrapper.querySelectorAll("*"))) {
    if (authorLink.contains(el)) continue;
    if (!(authorLink.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;

    const text = ownText(el);
    if (text && text !== authorName) return text;
  }

  return "";
}

// Order matters: a reposted post can also contain an image/poll/article, but
// "repost" is the more useful classification, so it's checked first.
function classifyPostType(container: Element, config: ExtensionConfig): PostType {
  if (config.repostIndicatorSelector && container.querySelector(config.repostIndicatorSelector)) return "repost";
  if (config.pollIndicatorSelector && container.querySelector(config.pollIndicatorSelector)) return "poll";
  if (config.articleIndicatorSelector && container.querySelector(config.articleIndicatorSelector)) return "article";
  if (config.imageIndicatorSelector && container.querySelector(config.imageIndicatorSelector)) return "image";
  return "text";
}

function sendPostToSidePanel(post: SelectedPost) {
  console.log("[content-script] sending post to side panel:", post);

  // Written first, and the path the side panel actually relies on: it
  // survives the panel being closed at click time, and survives the Home
  // screen being unmounted (App.tsx renders only the active screen, so
  // HomeScreen's listener does not exist while another tab is showing).
  chrome.storage.local
    .set({ [LAST_POST_STORAGE_KEY]: post })
    .catch((err) => console.warn("[content-script] failed to store post:", err));

  // Kept as the instant path for an already-open panel — storage.onChanged
  // would cover this too, but the message arrives without a storage round
  // trip and costs nothing when there's no receiver.
  chrome.runtime.sendMessage({ type: MESSAGE_TYPE, post }, () => {
    if (chrome.runtime.lastError) {
      // Expected whenever the side panel is closed. Harmless now that the
      // stored copy above is what the panel reads on open.
      console.log("[content-script] sendMessage had no receiver:", chrome.runtime.lastError.message);
    }
  });
}

async function handleClick(event: MouseEvent) {
  const target = event.target as Element | null;
  if (!target) return;

  const config = await getConfig();

  const commentButton = target.closest(config.commentButtonSelector);
  if (!commentButton) return; // not a click on (or inside) a Comment button

  const postContainer = commentButton.closest(config.postContainerSelector);
  if (!postContainer) {
    console.warn(
      `[content-script] matched a Comment button but no ancestor matched postContainerSelector ("${config.postContainerSelector}") — LinkedIn's DOM has likely changed; update the selector in app/api/ext/config.`,
    );
    return;
  }

  // Text first: the author's last-resort tier is cross-checked against it.
  const text = extractPostText(postContainer, config.postTextSelector);
  const author = extractAuthor(postContainer, config, text);

  const post: SelectedPost = {
    authorName: author.name,
    authorHeadline: extractHeadlineNear(author.link, author.name),
    text,
    type: classifyPostType(postContainer, config),
    // The post's own permalink when the container exposes one, else the page
    // URL. Only used for the history row's link, so degrading to the feed URL
    // costs nothing functionally.
    url:
      postContainer.querySelector<HTMLAnchorElement>('a[href*="/feed/update/"]')?.href ??
      window.location.href,
    capturedAt: Date.now(),
  };

  if (!post.authorName || !post.text) {
    console.warn(
      `[content-script] incomplete extraction — author: "${post.authorName}" (strategy: ${author.strategy}), text length: ${post.text.length}. LinkedIn's DOM may have changed; see the selectors in app/api/ext/config.`,
    );
  }

  sendPostToSidePanel(post);
}

// One delegated listener rather than one per Comment button — LinkedIn's
// feed is virtualized/infinite-scroll, so buttons are constantly added and
// removed; a delegated listener needs no re-attachment as that happens.
//
// Capture phase on `document`, not bubble phase on `document.body`: capture
// runs top-down before the target's own handlers, and LinkedIn's own
// comment-box handler calls stopPropagation(), so a bubble-phase listener
// never sees the click at all.
document.addEventListener(
  "click",
  (event) => {
    handleClick(event).catch((err) => console.warn("[content-script] handleClick failed:", err));
  },
  true,
);
