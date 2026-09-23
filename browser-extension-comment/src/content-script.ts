// src/content-script.ts — injected into linkedin.com (see
// manifest.config.ts's content_scripts entry for this file). Watches every
// click on the page for LinkedIn's per-post Comment button; when one fires,
// walks up to that post's container, extracts what we can about the post,
// and hands it to the side panel (see sendPostToSidePanel for why that goes
// through chrome.storage as well as chrome.runtime.sendMessage). A click on
// Reply under a comment goes through the same hand-off tagged mode "reply",
// carrying the comment thread as well (see handleReplyClick).
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
import { commentUrn, extractThread, findReplyButton, getSelfName, sameName } from "@/content/replyThread";
import {
  extractProfile,
  findConnectButton,
  insertIntoNoteBox,
  checkProfileOwnersConnect,
  isProfilePage,
} from "@/content/connectNote";
import {
  READ_SELF_PROFILE_MESSAGE_TYPE,
  SELF_PROFILE_STORAGE_KEY,
  type LinkedInProfileInfo,
} from "@/lib/connectionNote";

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

// Must match INSERT_MESSAGE_TYPE in HomeScreen.tsx. Sent by the side panel
// after the user has confirmed the Insert risk warning.
const INSERT_MESSAGE_TYPE = "carouselabs:insert-comment";

type PostType = "text" | "image" | "article" | "poll" | "repost";

interface ExtensionConfig {
  commentButtonSelector: string;
  postContainerSelector: string;
  postContainerFallbackSelector: string;
  authorProfileHrefSelector: string;
  authorLinkSelector: string;
  authorHeaderSelector: string;
  postTextSelector: string;
  commentItemSelector: string;
  commentBoxSelector: string;
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
  postContainerFallbackSelector: "[componentkey^='update-card-focus']",
  authorProfileHrefSelector: 'a[href*="/in/"], a[href*="/company/"]',
  authorLinkSelector: `a[aria-label^="View "][aria-label$="'s profile"]`,
  authorHeaderSelector: "[componentkey^='feed-header']",
  postTextSelector: '[data-testid="expandable-text-box"]',
  commentItemSelector:
    "[componentkey*='replaceableComment_urn:li:comment:'], [componentkey*='CommentComponentReference_urn:li:comment:']",
  commentBoxSelector:
    "div[contenteditable='true'][role='textbox'], div.ql-editor[contenteditable='true'], div[contenteditable='true'][aria-label*='comment' i]",
  imageIndicatorSelector: ".update-components-image",
  articleIndicatorSelector: ".update-components-article",
  pollIndicatorSelector: ".update-components-poll",
  repostIndicatorSelector:
    ".update-components-mini-update-v2, .feed-shared-reshared-update-v2, .update-components-actor--reshared",
  insertEnabled: true,
};

// One comment in a captured thread, as the side panel and the generate route
// receive it. Keep in sync with ReplyThreadEntry in HomeScreen.tsx.
interface ReplyThreadEntry {
  author: string;
  text: string;
  depth: number;
  isTarget: boolean;
  // Written by the signed-in user / by the post's author. false when unknown.
  isSelf: boolean;
  isPostAuthor: boolean;
}

// Present when the user clicked Reply under a comment rather than the post's
// Comment button.
interface ReplySelection {
  targetAuthor: string;
  targetText: string;
  // Reading order; exactly one entry has isTarget set.
  thread: ReplyThreadEntry[];
  // null when either name is unknown: "can't tell" is kept distinct from "not
  // yours", so a failed author extraction never reads as someone else's post.
  isOwnPost: boolean | null;
}

interface SelectedPost {
  // "reply" tags a Reply capture, so the panel can tell it apart from a plain
  // Comment on the post. Both travel through the same storage key and message,
  // so whichever the user clicked last is what the panel shows.
  mode: "comment" | "reply" | "connect";
  authorName: string;
  authorHeadline: string;
  text: string;
  type: PostType;
  url: string;
  capturedAt: number;
  reply?: ReplySelection;
  // Present in "connect" mode: the person whose Connect button was clicked.
  // The post fields above then carry their name and headline, text is empty.
  connect?: { target: LinkedInProfileInfo };
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

// Comment author links render the follow state in its own span with only
// whitespace before it ("Chaim Simcha Following"). Case-sensitive, unlike the
// separator form above, so a name that merely ends in a lowercase "follow"
// is never truncated; LinkedIn always capitalises these labels.
const SPACED_LINK_SUFFIX_PATTERN = /\s+(Following|Follow|1st|2nd|3rd\+?)$/;

// Company/page commenters carry a follower count ("… 271 followers",
// "… • 1.2K followers") and sometimes a Premium badge after the name.
// "Premium" is case-sensitive for the same reason as above.
const FOLLOWER_COUNT_SUFFIX_PATTERN = /\s*[•·|]?\s*\d[\d.,]*\s*[KMB]?\+?\s+followers?$/i;
const PREMIUM_SUFFIX_PATTERN = /\s+Premium$/;

// The name repeated for screen readers, either back to back ("NameName") or
// with the Premium badge between the copies ("CarouseLabs PremiumCarouseLabs").
// A plain space between copies is deliberately not collapsed: "Li Li" can be a
// real name.
const REPEATED_NAME_PATTERN = /^(.+?)(?: ?Premium ?)?\1$/;

function cleanLinkName(raw: string): string {
  let text = raw.replace(/\s+/g, " ").trim();

  // Looped because a link can carry more than one of these at once
  // ("CarouseLabs Premium 271 followers").
  let previous = "";
  while (text !== previous) {
    previous = text;
    text = text.replace(LINK_SUFFIX_PATTERN, "").trim();
    text = text.replace(SPACED_LINK_SUFFIX_PATTERN, "").trim();
    text = text.replace(FOLLOWER_COUNT_SUFFIX_PATTERN, "").trim();
    text = text.replace(PREMIUM_SUFFIX_PATTERN, "").trim();
  }

  // Collapse a repeated name back to a single copy.
  const repeated = text.match(REPEATED_NAME_PATTERN);
  if (repeated) text = repeated[1].trim();

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

function handleConnectClick(connectButton: Element) {
  // A Connect for someone in the sidebar ("People also viewed") would
  // otherwise capture the page owner's profile under the wrong person's name.
  // Both sides of the comparison are logged, so a wrong verdict is readable
  // from this one line.
  const owner = checkProfileOwnersConnect(connectButton);
  console.log(
    `[content-script] Connect detected on ${window.location.pathname} — invited name: "${owner.invited}" | page owner name: "${owner.ownerName}" | url slug: "${owner.slug}" | ${owner.ok ? "accepted" : "IGNORED"} (${owner.reason})`,
  );
  if (!owner.ok) return;

  const extraction = extractProfile(connectButton);
  const { profile } = extraction;
  console.log(
    `[content-script] profile extracted — name: "${profile.name}" (${extraction.strategies.name}), headline: "${profile.headline}" (${extraction.strategies.headline}), role: "${profile.currentRole}" (${extraction.strategies.currentRole}), about: ${profile.about.length} chars (${extraction.strategies.about})`,
  );

  if (!profile.name || (!profile.headline && !profile.currentRole)) {
    console.warn(
      `[content-script] incomplete profile extraction — name: "${profile.name}" (${extraction.strategies.name}), headline: ${profile.headline ? "yes" : "no"}, role: ${profile.currentRole ? "yes" : "no"}. See src/content/connectNote.ts.`,
    );
  }

  sendPostToSidePanel({
    mode: "connect",
    authorName: profile.name,
    authorHeadline: profile.headline,
    text: "",
    type: "text",
    url: profile.url,
    capturedAt: Date.now(),
    connect: { target: profile },
  });
}

// For "Use my LinkedIn profile": the side panel asks while the user has their
// own profile open. Stored for later notes, and returned so the panel can show
// what it read.
async function readSelfProfile(): Promise<{ ok: boolean; profile?: LinkedInProfileInfo; error?: string }> {
  if (!isProfilePage()) return { ok: false, error: "Open your own LinkedIn profile in this tab first." };

  const { profile } = extractProfile(null);
  if (!profile.name) {
    return { ok: false, error: "Couldn't read the profile on this page. Let it finish loading, then try again." };
  }

  // false only when both names are known and differ; unknown is allowed, since
  // the nav avatar isn't always readable.
  const self = await getSelfName();
  if (sameName(profile.name, self.name) === false) {
    return { ok: false, error: `This is ${profile.name}'s profile, not yours. Open your own profile, then try again.` };
  }

  await chrome.storage.local.set({ [SELF_PROFILE_STORAGE_KEY]: profile });
  return { ok: true, profile };
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

type ContainerStrategy = "primary" | "fallback" | "single-on-page" | "none";

// The post a click belongs to, tried in descending order of trust:
//   1. postContainerSelector: verified on the main feed, one match per post.
//   2. postContainerFallbackSelector: the same componentkey prefix without
//      the tag/role requirement, for layouts like /posts/<slug> permalink
//      pages (componentkey "...FeedType_FEED_DETAIL") where the verified
//      selector matches nothing. The OUTERMOST match is taken, since without
//      the role anchor an inner wrapper could share the prefix.
//   3. The page's only fallback match, when the card isn't an ancestor of
//      the click at all (comments rendered beside the post, not inside it).
//      Only when exactly one exists, so a feed can never pick the wrong post.
function findPostContainer(from: Element, config: ExtensionConfig): { container: Element | null; strategy: ContainerStrategy } {
  const primary = from.closest(config.postContainerSelector);
  if (primary) return { container: primary, strategy: "primary" };

  // Older cached configs predate this key.
  const fallbackSelector = config.postContainerFallbackSelector || FALLBACK_CONFIG.postContainerFallbackSelector;

  let outermost: Element | null = null;
  for (let el = from.parentElement; el; el = el.parentElement) {
    if (el.matches(fallbackSelector)) outermost = el;
  }
  if (outermost) return { container: outermost, strategy: "fallback" };

  const onPage = document.querySelectorAll(fallbackSelector);
  if (onPage.length === 1) return { container: onPage[0], strategy: "single-on-page" };

  return { container: null, strategy: "none" };
}

async function handleClick(event: MouseEvent) {
  const target = event.target as Element | null;
  if (!target) return;

  const config = await getConfig();

  // Profile pages only: Connect buttons elsewhere (My Network, search
  // results) have no profile page around them to read.
  const connectButton = isProfilePage() ? findConnectButton(target) : null;
  if (connectButton) {
    handleConnectClick(connectButton);
    return;
  }

  // Checked before Comment and returns early: a Reply under a comment is its own flow
  // and must never fall through into the post Comment handling below.
  const replyButton = findReplyButton(target);
  if (replyButton) {
    await handleReplyClick(replyButton, config);
    return;
  }

  const commentButton = target.closest(config.commentButtonSelector);
  if (!commentButton) return; // not a click on (or inside) a Comment button

  const { container: postContainer } = findPostContainer(commentButton, config);
  if (!postContainer) {
    console.warn(
      `[content-script] matched a Comment button but no post container was found (postContainerSelector "${config.postContainerSelector}", fallback "${config.postContainerFallbackSelector}") — LinkedIn's DOM has likely changed; update the selector in app/api/ext/config.`,
    );
    return;
  }

  // Remembered so a later Insert targets this post's comment box rather than
  // whichever one happens to be first in the feed.
  lastPostContainer = postContainer;

  // Text first: the author's last-resort tier is cross-checked against it.
  const text = extractPostText(postContainer, config.postTextSelector);
  const author = extractAuthor(postContainer, config, text);

  const post: SelectedPost = {
    mode: "comment",
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

// KNOWN LIMITATION: built and verified for the main feed (linkedin.com/feed).
// On other layouts, such as a profile's Recent Activity listing
// (/in/<slug>/recent-activity/), the post author comes back empty, so
// isOwnPost is null there. Deliberately unsupported for now: replying from
// the feed is the real use case.
async function handleReplyClick(replyButton: Element, config: ExtensionConfig) {
  const { container: postContainer, strategy: containerStrategy } = findPostContainer(replyButton, config);
  if (!postContainer) {
    console.warn(
      `[content-script] matched a Reply control but no post container was found (postContainerSelector "${config.postContainerSelector}", fallback "${config.postContainerFallbackSelector}") — extracting the thread from the whole page instead.`,
    );
  }
  // A container found as "the page's only post" may not hold the comments,
  // so the thread is only scoped to it when the click is actually inside it.
  const scope = postContainer?.contains(replyButton) ? postContainer : document.body;

  const self = await getSelfName();

  // Post fields first, via the same extraction the Comment flow uses, so the
  // post author is known before thread entries are compared against it.
  let text = postContainer ? extractPostText(postContainer, config.postTextSelector) : "";
  const author = postContainer ? extractAuthor(postContainer, config, text) : null;
  const authorName = author?.name ?? "";

  const thread = extractThread(
    replyButton,
    scope,
    {
      // Older cached configs predate this key; the fallback keeps them working.
      commentItemSelector: config.commentItemSelector || FALLBACK_CONFIG.commentItemSelector,
      profileHrefSelector: config.authorProfileHrefSelector,
      postTextSelector: config.postTextSelector,
    },
    { postAuthor: authorName, self: self.name },
    { nameFromProfileLink: extractNameFromProfileLink, ownText },
  );

  // Comments may share the post body's text anchor. On a post with no text of
  // its own, the first match would then be a comment — so it isn't post text.
  const firstTextEl = postContainer?.querySelector(config.postTextSelector);
  if (firstTextEl && thread.allItems.some((item) => item.contains(firstTextEl))) text = "";

  const target = thread.entries.find((entry) => entry.isTarget);
  if (!target || !thread.targetItem) {
    // Nothing is sent: a reply with no comment to reply to would only fail at
    // Generate, and the panel keeps showing whatever was selected before.
    console.warn(
      `[content-script] Reply clicked but the comment it belongs to wasn't found (item strategy: ${thread.itemStrategy}, container: ${containerStrategy}) — check commentItemSelector in app/api/ext/config.`,
    );
    return;
  }

  const isOwnPost = sameName(authorName, self.name);
  if (isOwnPost === null) {
    const why = !authorName
      ? postContainer
        ? "post author not extracted (container found, author extraction failed)"
        : "post author not extracted (no post container: unsupported page layout?)"
      : `your LinkedIn name unknown (${self.reason})`;
    console.warn(`[content-script] couldn't tell whether this is your post: ${why}.`);
  }

  // Remembered so Insert can put the text in THIS comment's reply box. The
  // URNs let it re-find the elements if LinkedIn re-renders the thread first.
  lastReplyTarget = {
    item: thread.targetItem,
    root: thread.rootItem,
    itemUrn: commentUrn(thread.targetItem),
    rootUrn: thread.rootItem ? commentUrn(thread.rootItem) : null,
    postContainer,
  };

  sendPostToSidePanel({
    mode: "reply",
    authorName,
    authorHeadline: extractHeadlineNear(author?.link ?? null, authorName),
    text,
    type: postContainer ? classifyPostType(postContainer, config) : "text",
    url:
      postContainer?.querySelector<HTMLAnchorElement>('a[href*="/feed/update/"]')?.href ??
      window.location.href,
    capturedAt: Date.now(),
    reply: {
      targetAuthor: target.authorName,
      targetText: target.text,
      thread: thread.entries.map((entry) => ({
        author: entry.authorName,
        text: entry.text,
        depth: entry.depth,
        isTarget: entry.isTarget,
        isSelf: entry.isSelf === true,
        isPostAuthor: entry.isPostAuthor === true,
      })),
      isOwnPost,
    },
  });
}

// The container of the post whose Comment button was clicked last. Insert
// needs it to scope the search for LinkedIn's comment box, so that a feed with
// several open comment boxes puts the text in the right one.
let lastPostContainer: Element | null = null;

// The comment whose Reply was clicked last, for Insert in reply mode.
let lastReplyTarget: {
  item: Element;
  root: Element | null;
  itemUrn: string | null;
  rootUrn: string | null;
  postContainer: Element | null;
} | null = null;

// A remembered element if it is still on the page, else the current element
// carrying the same comment URN (LinkedIn may have re-rendered the thread).
// querySelector returns the first match in document order, which is that
// comment's outermost wrapper.
function liveCommentElement(el: Element | null, urn: string | null): Element | null {
  if (el?.isConnected) return el;
  if (!urn) return null;
  return document.querySelector(`[componentkey*=${JSON.stringify(`urn:li:comment:(${urn})`)}]`);
}

// LinkedIn opens the reply box when Reply is clicked. Where it renders isn't
// verified against live markup yet, so this looks in descending order of
// certainty and never falls back to the post's main comment box: putting a
// reply there would publish it as a top-level comment on the post.
function findReplyBox(config: ExtensionConfig): HTMLElement | null {
  if (!lastReplyTarget) return null;
  const itemSelector = config.commentItemSelector || FALLBACK_CONFIG.commentItemSelector;
  const item = liveCommentElement(lastReplyTarget.item, lastReplyTarget.itemUrn);
  const root = liveCommentElement(lastReplyTarget.root, lastReplyTarget.rootUrn);

  // 1. Inside the target comment, and belonging to it rather than to one of
  //    its nested replies: the nearest comment wrapper names the same URN.
  if (item) {
    const own = Array.from(item.querySelectorAll<HTMLElement>(config.commentBoxSelector)).find((box) => {
      const owner = box.closest(itemSelector);
      return owner ? commentUrn(owner) === lastReplyTarget?.itemUrn : true;
    });
    if (own) return own;
  }

  // 2. Anywhere in the thread: replying to a reply usually opens the box at
  //    the foot of the thread. Prefer the first box after the target.
  if (root) {
    const boxes = Array.from(root.querySelectorAll<HTMLElement>(config.commentBoxSelector));
    const after = item
      ? boxes.find((box) => item.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)
      : undefined;
    if (after ?? boxes[0]) return after ?? boxes[0];
  }

  // 3. The editor LinkedIn focused when Reply was clicked, if it still has
  //    focus on the page and sits in the same thread or post.
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.matches(config.commentBoxSelector)) {
    const scope = root ?? lastReplyTarget.postContainer;
    if (!scope || scope.contains(active)) return active;
  }

  return null;
}

// Places text into LinkedIn's own comment or reply box. Deliberately limited
// to filling the field: nothing here clicks Post, and nothing submits. The
// user reviews and posts it themselves.
async function insertIntoCommentBox(
  text: string,
  mode: "comment" | "reply",
): Promise<{ ok: boolean; error?: string }> {
  const config = await getConfig();

  const box =
    mode === "reply"
      ? findReplyBox(config)
      : (lastPostContainer ?? document).querySelector<HTMLElement>(config.commentBoxSelector);

  if (!box) {
    return {
      ok: false,
      error:
        mode === "reply"
          ? "Couldn't find the reply box. Click Reply on the comment again, then try Insert."
          : "Couldn't find LinkedIn's comment box. Open the comment box on the post first, then try again.",
    };
  }

  box.focus();

  // A reply box can already hold LinkedIn's @mention of the person being
  // replied to. Insert after it, with a separating space, rather than at
  // whatever position focus() left the caret.
  let toInsert = text;
  if (mode === "reply") {
    const range = document.createRange();
    range.selectNodeContents(box);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const existing = box.textContent ?? "";
    if (existing.trim() && !/\s$/.test(existing)) toInsert = ` ${text}`;
  }

  // execCommand is deprecated but remains the most reliable way to fill a
  // contenteditable owned by a framework: it produces the same input events a
  // real keystroke would, so LinkedIn's editor registers the text instead of
  // silently discarding it on the next render.
  const inserted = document.execCommand("insertText", false, toInsert);

  if (!inserted) {
    // Fallback for editors where execCommand is blocked. Sets the text, then
    // fires the input event the framework listens for. In reply mode it
    // appends, so a pre-filled mention survives.
    box.textContent = mode === "reply" ? `${box.textContent ?? ""}${toInsert}` : text;
    box.dispatchEvent(new InputEvent("input", { bubbles: true, data: toInsert, inputType: "insertText" }));
  }

  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === READ_SELF_PROFILE_MESSAGE_TYPE) {
    readSelfProfile()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (!message || message.type !== INSERT_MESSAGE_TYPE || typeof message.text !== "string") {
    return; // not our message — leave the channel alone for other listeners
  }

  // A connection note goes into the invitation dialog, not a comment box.
  if (message.mode === "connect") {
    sendResponse(insertIntoNoteBox(message.text));
    return;
  }

  // Older panels send no mode; they only know about comments.
  insertIntoCommentBox(message.text, message.mode === "reply" ? "reply" : "comment")
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err) }));

  return true; // keep the channel open for the async sendResponse above
});

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
