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
import { insertIntoComposeBox, readConversation } from "@/content/messageThread";
import { typeInto, usableEditor } from "@/content/editor";
import { waitFor } from "@/content/waitFor";
import { READ_CONVERSATION_MESSAGE_TYPE } from "@/lib/messageThread";
import { PING_MESSAGE_TYPE } from "@/lib/tabs";
import { insertSwitch as readInsertSwitch, readInsertEnabled, rememberInsertSwitch } from "@/lib/insertSwitch";
import { insertOnce, type InsertAnswer } from "@/lib/insertOnce";

// Captured posts, threads and profiles are other people's content; they go to
// the page console only in development builds.
const DEV = import.meta.env.MODE !== "production";

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
// when the user clicks Insert.
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
  // Comment and reply modes: where Insert must put the text. The panel sends
  // it back, untouched, with the Insert.
  target?: InsertTarget;
}

// Which post (and, for a reply, which comment) a capture was for, so Insert
// finds that one box again — after LinkedIn redraws the card, from another
// LinkedIn tab, or in a fresh copy of this script — and never a different
// post's box.
interface InsertTarget {
  // This capture's own id: only the copy of this script that made it may use
  // the elements it remembered (lastPostContainer, lastReplyTarget).
  captureId: string;
  // The post card's componentkey, and the URN in its permalink. Either finds
  // the card again; both null when the layout shows neither.
  postKey: string | null;
  postUrn: string | null;
  // Reply mode: the comment replied to, and the top comment of its thread.
  commentUrn?: string | null;
  rootUrn?: string | null;
}

// Reading a conversation is on-demand (see src/content/messageThread.ts's
// header for why), so there is no "message" SelectedPost mode to route
// through handleClick — the side panel asks for this directly via
// READ_CONVERSATION_MESSAGE_TYPE and gets the result back in the response,
// rather than through the storage/broadcast hand-off every other mode uses.

console.log("[content-script] loaded on", window.location.href);

// Fetched once and cached for the life of this content script instance (a
// fresh LinkedIn page load re-injects the script and re-fetches).
let configPromise: Promise<ExtensionConfig> | null = null;

// A stalled connection must not hold up an Insert (which says it couldn't
// check) for long.
const CONFIG_TIMEOUT_MS = 8_000;

// The selectors a click is read with, available at once: this page's answer
// from the server once it has arrived, else the last one any page got (kept
// in extension storage), else the built-in copy. A click never waits for the
// network: on a slow connection the wait made Comment seem to do nothing, and
// by the time the answer came LinkedIn had often redrawn the clicked button
// out of the page, so the click was lost.
const CONFIG_STORAGE_KEY = "contentScriptConfig";
let serverConfig: ExtensionConfig | null = null;
let storedConfig: ExtensionConfig | null = null;

// Every key present even when the server (or an older stored copy) left one
// out, so no selector is ever undefined.
function completeConfig(config: Partial<ExtensionConfig> | null | undefined): ExtensionConfig {
  const complete = { ...FALLBACK_CONFIG };
  for (const [key, value] of Object.entries(config ?? {})) {
    if (key in complete && value !== undefined && value !== null && value !== "") {
      (complete as Record<string, unknown>)[key] = value;
    }
  }
  return complete;
}

function configNow(): ExtensionConfig {
  return serverConfig ?? storedConfig ?? FALLBACK_CONFIG;
}

chrome.storage.local
  .get(CONFIG_STORAGE_KEY)
  .then((stored) => {
    if (stored[CONFIG_STORAGE_KEY]) storedConfig = completeConfig(stored[CONFIG_STORAGE_KEY] as Partial<ExtensionConfig>);
  })
  .catch(() => {
    // No stored copy: the built-in one is used until the server answers.
  });

async function loadConfig(): Promise<ExtensionConfig> {
  const baseUrl = await getApiBaseUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/api/ext/config`, { signal: controller.signal });
    if (!res.ok) throw new Error(`/api/ext/config responded ${res.status}`);
    const config = completeConfig((await res.json()) as Partial<ExtensionConfig>);
    // This reading of the Insert switch counts for the next Insert too.
    rememberInsertSwitch(config.insertEnabled !== false);
    serverConfig = config;
    void chrome.storage.local.set({ [CONFIG_STORAGE_KEY]: config }).catch(() => {});
    return config;
  } finally {
    clearTimeout(timer);
  }
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
  if (DEV) {
    console.log(
      `[content-script] Connect detected on ${window.location.pathname} — invited name: "${owner.invited}" | page owner name: "${owner.ownerName}" | url slug: "${owner.slug}" | ${owner.ok ? "accepted" : "IGNORED"} (${owner.reason})`,
    );
  }
  // Whichever Connect was clicked last is the invitation dialog that's open.
  // A Connect for someone else clears the target, so a note written for the
  // page owner can't be inserted into that other person's invitation.
  lastConnectTargetPath = null;
  if (!owner.ok) return;

  const extraction = extractProfile(connectButton);
  const { profile } = extraction;
  lastConnectTargetPath = profilePath(profile.url);
  if (DEV) {
    console.log(
      `[content-script] profile extracted — name: "${profile.name}" (${extraction.strategies.name}), headline: "${profile.headline}" (${extraction.strategies.headline}), role: "${profile.currentRole}" (${extraction.strategies.currentRole}), about: ${profile.about.length} chars (${extraction.strategies.about})`,
    );
  }

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
  if (DEV) console.log("[content-script] sending post to side panel:", post);

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

// The Comment button a click landed on (or inside): the configured selector,
// else any button that calls itself exactly "Comment", by its label or its
// text, so a layout whose button lost or reworded its aria-label still counts.
// Never a button that submits a comment ("Comment" is also the label of the
// comment box's own Post button in some layouts): that would replace the
// panel's post as the person posts.
const COMMENT_LABEL_PATTERN = /^comment$/i;

function findCommentButton(target: Element, selector: string): Element | null {
  const configured = target.closest(selector);
  if (configured) return configured;
  const control = target.closest("button, [role='button']");
  if (!control || control.closest("form") || control.getAttribute("type") === "submit") return null;
  const label = control.getAttribute("aria-label")?.trim() ?? "";
  const text = (control.textContent ?? "").replace(/\s+/g, " ").trim();
  return COMMENT_LABEL_PATTERN.test(label) || COMMENT_LABEL_PATTERN.test(text) ? control : null;
}

// Must match CAPTURE_FAILURE_STORAGE_KEY in HomeScreen.tsx. A Comment click
// whose post couldn't be found, so the panel can say so (and tell the server)
// instead of staying silent. Only the kind of click and when: nothing from
// the page.
const CAPTURE_FAILURE_STORAGE_KEY = "lastCaptureFailure";

function reportCaptureFailure(mode: "comment") {
  chrome.storage.local
    .set({ [CAPTURE_FAILURE_STORAGE_KEY]: { mode, at: Date.now() } })
    .catch((err) => console.warn("[content-script] failed to store a capture failure:", err));
}

async function handleClick(event: MouseEvent) {
  const target = event.target as Element | null;
  if (!target) return;

  // Read with the selectors at hand, never waiting for the server's (see
  // configNow); a fetch that isn't done yet is left to finish for next time.
  const config = configNow();
  void getConfig();

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

  const commentButton = findCommentButton(target, config.commentButtonSelector);
  if (!commentButton) return; // not a click on (or inside) a Comment button

  const { container: postContainer } = findPostContainer(commentButton, config);
  if (!postContainer) {
    console.warn(
      `[content-script] matched a Comment button but no post container was found (postContainerSelector "${config.postContainerSelector}", fallback "${config.postContainerFallbackSelector}") — LinkedIn's DOM has likely changed; update the selector in app/api/ext/config.`,
    );
    reportCaptureFailure("comment");
    return;
  }

  // Remembered so a later Insert targets this post's comment box rather than
  // whichever one happens to be first in the feed.
  lastPostContainer = postContainer;
  const insertTarget = rememberCapture({ ...postIdentity(postContainer) });

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
    target: insertTarget,
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
  const insertTarget = rememberCapture({
    ...postIdentity(postContainer),
    commentUrn: lastReplyTarget.itemUrn,
    rootUrn: lastReplyTarget.rootUrn,
  });

  sendPostToSidePanel({
    target: insertTarget,
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

// The target of this copy's last Comment or Reply capture (see InsertTarget).
let lastCapture: InsertTarget | null = null;

function rememberCapture(identity: Omit<InsertTarget, "captureId">): InsertTarget {
  const captureId =
    typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  lastCapture = { captureId, ...identity };
  return lastCapture;
}

// The URN in a post card's permalink ("urn:li:activity:7123…"), if it has one.
function permalinkUrn(card: Element | null): string | null {
  const href = card?.querySelector('a[href*="/feed/update/"]')?.getAttribute("href") ?? "";
  return /\/feed\/update\/(urn:li:[A-Za-z]+:\d+)/.exec(href)?.[1] ?? null;
}

function postIdentity(card: Element | null): Pick<InsertTarget, "postKey" | "postUrn"> {
  return { postKey: card?.getAttribute("componentkey") || null, postUrn: permalinkUrn(card) };
}

// Whether an Insert's target is this copy's own last capture, so its
// remembered elements are the right ones. An Insert with no target comes from
// an older panel, which only ever meant the last capture.
function isOwnCapture(target: InsertTarget | undefined): boolean {
  return !target || (lastCapture !== null && target.captureId === lastCapture.captureId);
}

// The post card an element sits in: the verified container, else the
// outermost fallback match, as findPostContainer does — never a guess.
function cardAround(el: Element, config: ExtensionConfig): Element | null {
  const primary = el.closest(config.postContainerSelector);
  if (primary) return primary;
  const fallbackSelector = config.postContainerFallbackSelector || FALLBACK_CONFIG.postContainerFallbackSelector;
  let outermost: Element | null = null;
  for (let p: Element | null = el; p; p = p.parentElement) if (p.matches(fallbackSelector)) outermost = p;
  return outermost;
}

// A post card found again on this page from a capture's identity: by its
// componentkey, else by its permalink, else (on the post's own page, which
// may not link to itself) the page's only card. Only a single match counts.
function findPostCard(config: ExtensionConfig, identity: Pick<InsertTarget, "postKey" | "postUrn">): Element | null {
  const cards = new Set<Element>();
  if (identity.postKey) {
    for (const el of document.querySelectorAll(`[componentkey=${JSON.stringify(identity.postKey)}]`)) {
      cards.add(cardAround(el, config) ?? el);
    }
  }
  if (cards.size === 0 && identity.postUrn) {
    for (const link of document.querySelectorAll(`a[href*=${JSON.stringify(`/feed/update/${identity.postUrn}`)}]`)) {
      const card = cardAround(link, config);
      if (card) cards.add(card);
    }
    if (cards.size === 0 && window.location.pathname.includes(identity.postUrn)) {
      const fallbackSelector = config.postContainerFallbackSelector || FALLBACK_CONFIG.postContainerFallbackSelector;
      const onPage = Array.from(document.querySelectorAll(fallbackSelector)).filter(
        (el) => !el.parentElement?.closest(fallbackSelector),
      );
      if (onPage.length === 1) cards.add(onPage[0]);
    }
  }
  return cards.size === 1 ? [...cards][0] : null;
}

// The card of the post a comment is for: this copy's remembered card while it
// is still on the page, else the same post found again by its identity.
function resolvePostCard(config: ExtensionConfig, target: InsertTarget | undefined): Element | null {
  const own = isOwnCapture(target);
  if (own && lastPostContainer?.isConnected) return lastPostContainer;
  const identity = target ?? lastCapture;
  return identity ? findPostCard(config, identity) : null;
}

const hasIdentity = (target: InsertTarget | null | undefined): boolean =>
  !!(target && (target.postKey || target.postUrn || target.commentUrn));

// The /in/<slug> path of the profile whose Connect was clicked last, if that
// Connect was for the page owner. See handleConnectClick.
let lastConnectTargetPath: string | null = null;

function profilePath(url: string): string {
  try {
    return new URL(url, window.location.origin).pathname.replace(/\/+$/, "").toLowerCase();
  } catch {
    return "";
  }
}

// The comment whose Reply was clicked last, for Insert in reply mode.
let lastReplyTarget: {
  item: Element | null;
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

// The comment an Insert in reply mode is for: this copy's remembered one, or,
// for a capture made elsewhere (another tab, an earlier copy of this script),
// just its URNs, from which the elements are found again.
function replyTargetFor(target: InsertTarget | undefined): typeof lastReplyTarget {
  if (isOwnCapture(target) && lastReplyTarget) return lastReplyTarget;
  if (!target?.commentUrn) return null;
  return { item: null, root: null, itemUrn: target.commentUrn, rootUrn: target.rootUrn ?? null, postContainer: null };
}

// LinkedIn opens the reply box when Reply is clicked. Where it renders isn't
// verified against live markup yet, so this looks in descending order of
// certainty and never falls back to the post's main comment box: putting a
// reply there would publish it as a top-level comment on the post.
function findReplyBox(config: ExtensionConfig, reply: NonNullable<typeof lastReplyTarget>): HTMLElement | null {
  const itemSelector = config.commentItemSelector || FALLBACK_CONFIG.commentItemSelector;
  const item = liveCommentElement(reply.item, reply.itemUrn);
  const root = liveCommentElement(reply.root, reply.rootUrn);
  const usable = (box: HTMLElement) => usableEditor(box) && !isMessageComposeBox(box);

  // 1. Inside the target comment, and belonging to it rather than to one of
  //    its nested replies: the nearest comment wrapper names the same URN.
  if (item) {
    const own = Array.from(item.querySelectorAll<HTMLElement>(config.commentBoxSelector)).find((box) => {
      const owner = box.closest(itemSelector);
      return usable(box) && (owner ? commentUrn(owner) === reply.itemUrn : true);
    });
    if (own) return own;
  }

  // 2. Anywhere in the thread: replying to a reply usually opens the box at
  //    the foot of the thread. Prefer the first box after the target.
  if (root) {
    const boxes = Array.from(root.querySelectorAll<HTMLElement>(config.commentBoxSelector)).filter(usable);
    const after = item
      ? boxes.find((box) => item.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING)
      : undefined;
    if (after ?? boxes[0]) return after ?? boxes[0];
  }

  // 3. The editor LinkedIn focused when Reply was clicked, if it still has
  //    focus on the page and sits in the same thread or post. Only for this
  //    copy's own capture: anything else can't vouch for what has focus.
  const active = document.activeElement;
  if (reply.item && active instanceof HTMLElement && active.matches(config.commentBoxSelector) && usable(active)) {
    const scope = root ?? reply.postContainer;
    if (!scope || scope.contains(active)) return active;
  }

  return null;
}

// Places text into LinkedIn's own comment or reply box. Deliberately limited
// to filling the field: nothing here clicks Post, and nothing submits. The
// user reviews and posts it themselves.
// A DM compose box — in a chat pop-up, or the Messaging page — matches the
// generic contenteditable comment-box selector too. A comment must never be
// typed into one.
function isMessageComposeBox(el: Element): boolean {
  return !!el.closest(".msg-form__contenteditable, [class*='msg-overlay' i], [class*='msg-form' i]");
}

// The post's own top-level comment box: inside the captured post, not a
// reply box under one of its comments, not a DM box, and one that can be
// typed into.
function findPostCommentBox(config: ExtensionConfig, card: Element | null): HTMLElement | null {
  if (!card?.isConnected) return null;
  const itemSelector = config.commentItemSelector || FALLBACK_CONFIG.commentItemSelector;
  return (
    Array.from(card.querySelectorAll<HTMLElement>(config.commentBoxSelector)).find(
      (box) => !isMessageComposeBox(box) && !box.closest(itemSelector) && usableEditor(box),
    ) ?? null
  );
}

// How long Insert waits for a box LinkedIn is still opening, or a card it is
// redrawing, before saying it couldn't find it.
const BOX_WAIT_MS = 2_000;

// What the person is told when LinkedIn's editor didn't keep the text.
const NOT_KEPT = "LinkedIn's box didn't keep the text. It's still here in the panel: use Copy, then paste it in.";

async function insertIntoCommentBox(
  text: string,
  mode: "comment" | "reply",
  target: InsertTarget | undefined,
  wrote: () => void,
): Promise<InsertAnswer> {
  // Whether Insert is on was checked already (insertSwitch); the selectors
  // don't wait for the network either.
  const config = configNow();

  if (mode === "reply") {
    const reply = replyTargetFor(target);
    if (!reply) return { ok: false, error: "Click Reply on the comment again, then try Insert." };
    const box = await waitFor(() => findReplyBox(config, reply), BOX_WAIT_MS);
    if (!box) {
      return { ok: false, error: "Couldn't find the reply box. Click Reply on the comment again, then try Insert." };
    }
    // After anything already there, such as the @mention LinkedIn pre-fills.
    return typeInto(box, text, { refind: () => findReplyBox(config, reply), failure: NOT_KEPT, onWrite: wrote });
  }

  // Nothing to look for: this page never captured the post (the panel can
  // show one captured before a reload), and the panel sent nothing to find it
  // by. Inserting used to fill the first box on the page then — another
  // post's, or a chat pop-up's.
  const nothingToFind = !(isOwnCapture(target) && lastPostContainer?.isConnected) && !hasIdentity(target ?? lastCapture);
  if (nothingToFind) return { ok: false, error: "Click Comment on the post again, then try Insert." };

  const commentBox = () => findPostCommentBox(config, resolvePostCard(config, target));
  const box = await waitFor(commentBox, BOX_WAIT_MS);
  if (!box) {
    return resolvePostCard(config, target)
      ? { ok: false, error: "Couldn't find this post's comment box. Click Comment on the post to open it, then try Insert again." }
      : { ok: false, error: "That post isn't open in this tab. Go back to it, click Comment on it again, then Insert." };
  }
  // After anything already there: a draft the person typed while waiting.
  return typeInto(box, text, { refind: commentBox, failure: NOT_KEPT, onWrite: wrote });
}

// The server kill switch, from a recent reading or read again
// (lib/insertSwitch.ts). Fails closed: with no usable reading, nothing is
// inserted, and the person is told it was the connection.
async function insertSwitch(): Promise<"on" | "off" | "unknown"> {
  const baseUrl = await getApiBaseUrl();
  return readInsertSwitch((signal) => readInsertEnabled(baseUrl, signal));
}

type InsertRequest = {
  text: string;
  mode?: string;
  expect?: { threadPath?: string; contactName?: string; profileUrl?: string };
  // One per Insert click (src/lib/insertOnce.ts). Absent from older panels.
  insertId?: string;
  // Comment and reply modes: the capture's InsertTarget, as stored.
  target?: InsertTarget;
  // Connect mode: replace the person's own text in the note box (their choice).
  replace?: boolean;
};

// Only the fields this script reads, and only when they have the right shape:
// the target travels through the panel and storage.
function insertTargetOf(raw: unknown): InsertTarget | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const t = raw as Record<string, unknown>;
  if (typeof t.captureId !== "string") return undefined;
  const text = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    captureId: t.captureId,
    postKey: text(t.postKey),
    postUrn: text(t.postUrn),
    commentUrn: text(t.commentUrn),
    rootUrn: text(t.rootUrn),
  };
}

function handleInsert(message: InsertRequest): Promise<InsertAnswer> {
  return insertOnce(message.insertId, (wrote) => insertNow(message, wrote));
}

async function insertNow(message: InsertRequest, wrote: () => void): Promise<InsertAnswer> {
  const insert = await insertSwitch();
  if (insert === "off") {
    return { ok: false, error: "Insert is turned off right now. Use Copy instead." };
  }
  if (insert === "unknown") {
    return { ok: false, error: "Couldn't reach CarouseLabs to insert. Check your connection, then try again, or use Copy." };
  }

  // A connection note goes into the invitation dialog, and only for the
  // person it was written for.
  if (message.mode === "connect") {
    const expected = profilePath(message.expect?.profileUrl ?? "");
    if (!expected || !isProfilePage() || profilePath(window.location.href) !== expected) {
      return { ok: false, error: "This note is for a different profile than the one open. Open their profile, click Connect, then Insert." };
    }
    if (lastConnectTargetPath !== expected) {
      return { ok: false, error: "Click Connect on this profile again, then Insert." };
    }
    // replace: the person chose to replace what they had typed in the box.
    return insertIntoNoteBox(message.text, wrote, { replace: message.replace === true });
  }

  if (message.mode === "message") {
    const expected = message.expect;
    return insertIntoComposeBox(
      message.text,
      expected?.threadPath && expected.contactName
        ? { threadPath: expected.threadPath, contactName: expected.contactName }
        : undefined,
      wrote,
    );
  }

  // Older panels send no mode; they only know about comments.
  return insertIntoCommentBox(message.text, message.mode === "reply" ? "reply" : "comment", insertTargetOf(message.target), wrote);
}

function onRuntimeMessage(
  message: { type?: string; text?: unknown } | undefined,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
): boolean | undefined {
  // The side panel checks that this tab has a working copy before relying on
  // it (src/lib/tabs.ts).
  if (message?.type === PING_MESSAGE_TYPE) {
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === READ_SELF_PROFILE_MESSAGE_TYPE) {
    readSelfProfile()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (message?.type === READ_CONVERSATION_MESSAGE_TYPE) {
    readConversation()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (!message || message.type !== INSERT_MESSAGE_TYPE || typeof message.text !== "string") {
    return; // not our message — leave the channel alone for other listeners
  }

  handleInsert(message as InsertRequest)
    .then(sendResponse)
    .catch((err) => sendResponse({ ok: false, error: String(err) }));
  return true; // keep the channel open for the async sendResponse above
}

// ── One live copy per tab ──
// The extension injects this script into LinkedIn tabs that were already open
// when it was installed or updated (src/lib/tabs.ts), so a tab can briefly
// hold two copies: the fresh one, and the previous version's, whose
// connection to the extension is gone (every chrome.* call then fails with
// "Extension context invalidated"). Each copy registers its teardown on the
// page's window, and a new copy runs the previous one's before starting; a
// copy that finds its connection gone also tears itself down on its next
// click. So exactly one copy ever handles a click, a read or an Insert —
// never two Inserts of the same comment.
const INSTANCE_KEY = "__carouselabsCommentContentScript";
type Instance = { teardown: () => void };
const instances = window as unknown as Record<string, Instance | undefined>;

function extensionConnected(): boolean {
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!extensionConnected()) {
    instance.teardown();
    return;
  }
  handleClick(event).catch((err) => console.warn("[content-script] handleClick failed:", err));
}

const instance: Instance = {
  teardown() {
    document.removeEventListener("click", onDocumentClick, true);
    try {
      chrome.runtime.onMessage.removeListener(onRuntimeMessage);
    } catch {
      // The connection is already gone, and the listener with it.
    }
    if (instances[INSTANCE_KEY] === instance) delete instances[INSTANCE_KEY];
  },
};

instances[INSTANCE_KEY]?.teardown();
instances[INSTANCE_KEY] = instance;

chrome.runtime.onMessage.addListener(onRuntimeMessage);

// One delegated listener rather than one per Comment button — LinkedIn's
// feed is virtualized/infinite-scroll, so buttons are constantly added and
// removed; a delegated listener needs no re-attachment as that happens.
//
// Capture phase on `document`, not bubble phase on `document.body`: capture
// runs top-down before the target's own handlers, and LinkedIn's own
// comment-box handler calls stopPropagation(), so a bubble-phase listener
// never sees the click at all.
document.addEventListener("click", onDocumentClick, true);
