// src/content/connectNote.ts — "Connect" button detection, profile extraction
// and note insertion for the Connection Request Note feature, used by
// src/content-script.ts alongside its Comment and Reply flows.
//
// Profile pages run LinkedIn's newer server-driven UI: no <h1> anywhere, no
// #about / #experience anchors, and cards identified only by componentkey
// ("profileCardsAboveActivityTopcardOnly<slug>", "profileCardsExperienceOnly
// <slug>", "com.linkedin.sdui.profile.card.ref<id>"). Confirmed against live
// LinkedIn across several profiles. Extraction is anchored on those keys, on
// the page's own <title>/og: metadata, and on aria-labels — never on class
// names, which LinkedIn hashes per build. Each field reports the strategy
// that produced it.
//
// insertIntoNoteBox (LinkedIn's "Add a note" textarea) is UNVERIFIED: it has
// never been exercised against a live invitation dialog, since testing
// accounts have been out of free custom notes. If Insert reports it can't
// find the note box, that is the first thing to check — see NOTE_BOX_SELECTORS.

import type { LinkedInProfileInfo } from "@/lib/connectionNote";

// "Invite Jane Doe to connect" is the classic aria-label on both the top-card
// button and the item in the "More" menu; plain text "Connect" is the fallback.
const INVITE_LABEL_PATTERN = /^invite\s+(.+?)\s+to connect$/i;
const CONNECT_TEXT_PATTERN = /^connect$/i;

// Confirmed live: the More-menu item is an <a role="menuitem"> with no
// aria-label, carrying componentkey "ConnectButtonstate:invitation:urn:li:
// member:<id>_connect" and an href to /preload/custom-invite/?vanityName=<slug>.
const CONNECT_COMPONENTKEY_PATTERN = /connectbutton/i;
const CUSTOM_INVITE_HREF = "/preload/custom-invite/";

// Card anchors on the profile page, all suffixed with the member's slug.
const TOPCARD_KEY_PREFIX = "profileCardsAboveActivityTopcardOnly";
const EXPERIENCE_KEY_PREFIX = "profileCardsExperienceOnly";
const BELOW_ACTIVITY_KEY_PREFIX = "profileCardsBelowActivityPart";

const ABOUT_MAX_CHARS = 1500;

function collapse(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

// Text this element holds itself, ignoring its children's.
function ownText(el: Element): string {
  return collapse(
    Array.from(el.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? "")
      .join(" "),
  );
}

// A member profile's root: /in/<slug>/ (not /in/<slug>/recent-activity/ etc.).
export function isProfilePage(): boolean {
  return /^\/in\/[^/]+\/?$/.test(window.location.pathname);
}

export function findConnectButton(target: Element): Element | null {
  const control = target.closest("button, [role='button'], [role='menuitem'], a");
  if (!control) return null;
  const label = collapse(control.getAttribute("aria-label"));
  const text = collapse(control.textContent);
  const key = control.getAttribute("componentkey") ?? "";
  const href = control.getAttribute("href") ?? "";
  return CONNECT_COMPONENTKEY_PATTERN.test(key) ||
    href.includes(CUSTOM_INVITE_HREF) ||
    INVITE_LABEL_PATTERN.test(label) ||
    CONNECT_TEXT_PATTERN.test(text)
    ? control
    : null;
}

// The slug the control itself names, from /preload/custom-invite/?vanityName=.
// More reliable than any text on the page: it is who LinkedIn will invite.
function vanityNameFromControl(control: Element | null): string {
  const href = control?.getAttribute("href") ?? "";
  if (!href.includes(CUSTOM_INVITE_HREF)) return "";
  try {
    return (new URL(href, window.location.origin).searchParams.get("vanityName") ?? "").toLowerCase();
  } catch {
    return "";
  }
}

function nameFromInviteLabel(control: Element | null): string {
  return collapse(control?.getAttribute("aria-label")).match(INVITE_LABEL_PATTERN)?.[1] ?? "";
}

function profileHeading(): HTMLHeadingElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLHeadingElement>("main h1, h1"));
  // A page-level "LinkedIn" heading, or a whole paragraph marked up as h1,
  // is not the member's name.
  return (
    candidates.find((h) => {
      const text = collapse(h.textContent);
      return text.length > 0 && text.length <= 60 && text.toLowerCase() !== "linkedin";
    }) ?? null
  );
}

// Loose name comparison: accents, case, punctuation and trailing badge text
// ("Nick Abraham" vs a heading that also carries a status or degree) all vary.
function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  const [x, y] = [normalizeName(a), normalizeName(b)];
  if (!x || !y) return false;
  // Containment, not equality: the heading often carries more than the name.
  return x === y || x.includes(y) || y.includes(x);
}

// /in/nick-abraham-12345 → the page owner's slug, which a name can be checked
// against when the heading is unreadable.
function pageSlug(): string {
  return decodeURIComponent(window.location.pathname.split("/")[2] ?? "").toLowerCase();
}

function slugMatchesName(name: string, slug: string): boolean {
  const asSlug = normalizeName(name).replace(/\s+/g, "-");
  if (!asSlug || !slug) return false;
  return slug === asSlug || slug.startsWith(`${asSlug}-`);
}

// The profile page also lists OTHER people ("People also viewed", "More
// profiles for you"), each with its own Connect button, and a note written for
// the wrong person is worse than no note. But this only REJECTS on positive
// evidence that someone else was invited: an earlier version demanded proof of
// ownership (exact h1 equality, or the button inside the h1's section) and so
// rejected every click whenever the heading carried extra text or the top card
// wasn't a <section>.
//
// The invited name is checked against the heading AND the URL slug, so either
// one being readable is enough.
export function checkProfileOwnersConnect(control: Element): {
  ok: boolean;
  invited: string;
  ownerName: string;
  slug: string;
  reason: string;
} {
  const invited = nameFromInviteLabel(control);
  const ownerName = collapse(profileHeading()?.textContent) || nameFromPageTitle();
  const slug = pageSlug();
  const result = (ok: boolean, reason: string) => ({ ok, invited, ownerName, slug, reason });

  // Strongest signal when present: the control's own invite link names the
  // slug LinkedIn will invite, so it can be compared with the page's slug.
  const vanity = vanityNameFromControl(control);
  if (vanity && slug) {
    return vanity === slug
      ? result(true, "invite link's vanityName matches the URL slug")
      : result(false, `invite link is for "${vanity}", not this page`);
  }

  // No invite label to go on: the click is on this profile's page, so it is
  // taken at face value.
  if (!invited) return result(true, "no invite label; assumed the page owner");
  if (ownerName && namesMatch(invited, ownerName)) return result(true, "invite label matches the page heading");
  if (slugMatchesName(invited, slug)) return result(true, "invite label matches the URL slug");
  if (!ownerName && !slug) return result(true, "no page owner name to compare against");
  return result(false, "invite label names someone else than this page");
}

// The page's own title is "Name - Headline | LinkedIn" (sometimes prefixed
// with an unread count). Present on every profile, and unaffected by the card
// markup, so it is the one dependable source of the name on the new DOM.
// document.title FIRST: LinkedIn navigates between profiles without a page
// load, and the og:title meta keeps the value from whichever profile was
// loaded first, so reading it first reported the previous person.
function titleParts(): { name: string; rest: string } {
  const raw =
    document.title || document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const withoutSuffix = collapse(raw)
    .replace(/^\(\d+\)\s*/, "")
    .replace(/\s*\|\s*LinkedIn\s*$/i, "");
  const [name, ...rest] = withoutSuffix.split(/\s+[-–—]\s+/);
  return { name: collapse(name), rest: collapse(rest.join(" - ")) };
}

function nameFromPageTitle(): string {
  return titleParts().name;
}

function metaDescription(): string {
  return collapse(
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ??
      document.querySelector('meta[name="description"]')?.getAttribute("content") ??
      "",
  );
}

function cardByKeyPrefix(prefix: string): Element | null {
  return document.querySelector(`[componentkey^="${prefix}"]`);
}

// Distinct own-text lines inside a card, in order: enough to pick a headline
// out of the top card without knowing its internal markup.
function textLines(scope: Element, max = 40): string[] {
  const lines: string[] = [];
  for (const el of Array.from(scope.querySelectorAll("*"))) {
    const text = ownText(el);
    if (text.length < 2 || lines.includes(text)) continue;
    lines.push(text);
    if (lines.length >= max) break;
  }
  return lines;
}

type Strategy = string;

export interface ProfileExtraction {
  profile: LinkedInProfileInfo;
  strategies: { name: Strategy; headline: Strategy; currentRole: Strategy; about: Strategy };
}

const PRONOUNS_PATTERN = /^\(?(she|he|they|ze|xe)\s*\/\s*\w+\)?$/i;
const DEGREE_PATTERN = /^[·•]?\s*(1st|2nd|3rd\+?)$/i;
const HEADLINE_SKIP = new Set(["contact info", "connect", "message", "follow", "more", "open to"]);

// Section labels LinkedIn renders as their own line inside the profile card,
// confirmed live: "About" precedes the About text, "Position" precedes a job's
// title / company / dates.
const ABOUT_LABEL = "about";
const POSITION_LABEL = "position";
const SECTION_LABELS = new Set([ABOUT_LABEL, POSITION_LABEL, "featured", "skill", "education", "interests", "activity"]);

// Promo and chrome lines that sit above the real content: a live dump had the
// Sales Navigator panel first, which an earlier "first long line" rule wrongly
// took as the headline.
const PROMO_LINE_PATTERNS: RegExp[] = [
  /^sales insights$/i,
  /^key signals$/i,
  /sales navigator/i,
  /^people who can introduce you$/i,
  /your connection$/i,
  /posted in the past \d+ days$/i,
  /^cancel anytime/i,
  /^\d+ endorsements?$/i,
  /^featured with premium$/i,
  /^(see|show) (all|more)\b/i,
  /^\d+ (followers|connections)$/i,
];

function isPromoLine(line: string): boolean {
  return PROMO_LINE_PATTERNS.some((pattern) => pattern.test(line));
}

// The lines of the profile's own card, in reading order. The whole profile
// body lives inside the topcard card on the new DOM, so this is also where the
// About text and the first Position are found.
function profileLines(): string[] {
  const scope = cardByKeyPrefix(TOPCARD_KEY_PREFIX) ?? document.body;
  return textLines(scope, 80);
}

// Text that follows a section label line, e.g. the paragraph after "About".
function linesAfterLabel(lines: string[], label: string): string[] {
  const index = lines.findIndex((line) => line.toLowerCase() === label);
  if (index === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(index + 1)) {
    if (SECTION_LABELS.has(line.toLowerCase())) break;
    out.push(line);
  }
  return out;
}

// The identity card, confirmed live: a com.linkedin.sdui.profile.card.ref<id>
// card whose lines run name, badges, degree, HEADLINE, "Company · School",
// location, "Contact info". The activity card shares the prefix, so the right
// one is the card that actually names the member.
const SDUI_CARD_PREFIX = "com.linkedin.sdui.profile.card.ref";

// Found WITHOUT needing the name: the name itself is read from this card, so
// looking the card up by name would carry a stale name through to every field.
// The activity card shares the prefix and is skipped by its key.
function identityCardLines(): string[] {
  for (const card of Array.from(document.querySelectorAll(`[componentkey^="${SDUI_CARD_PREFIX}"]`))) {
    if (/activit/i.test(card.getAttribute("componentkey") ?? "")) continue;
    const lines = textLines(card, 12);
    // First line is the member's name, so the card must start with something
    // name-shaped and carry more than a heading.
    const first = lines[0] ?? "";
    if (lines.length >= 3 && first.length >= 2 && first.length <= 60 && !first.includes("·")) return lines;
  }
  return [];
}

function nameFromIdentityCard(): string {
  const first = identityCardLines()[0] ?? "";
  return isPromoLine(first) || SECTION_LABELS.has(first.toLowerCase()) ? "" : first;
}

// A line is a headline if it is long enough to be one and isn't the name, a
// degree, a location or the "Company · School" line. Order does the rest: the
// headline precedes those in the identity card.
function pickHeadline(lines: string[], name: string): string {
  for (const line of lines) {
    if (line.length < 20 || line.length > 220 || namesMatch(line, name)) continue;
    if (PRONOUNS_PATTERN.test(line) || DEGREE_PATTERN.test(line)) continue;
    if (HEADLINE_SKIP.has(line.toLowerCase()) || isPromoLine(line)) continue;
    return line;
  }
  return "";
}

// The headline from the identity card, then the top card, then the page title /
// meta description, both of which carry "Name - Headline".
function headlineOf(name: string, lines: string[]): { value: string; strategy: Strategy } {
  const fromIdentity = pickHeadline(identityCardLines(), name);
  if (fromIdentity) return { value: fromIdentity, strategy: "identity-card" };

  // Only lines BEFORE the first section label can be the headline; everything
  // after belongs to About, Position and the rest.
  const firstSection = lines.findIndex((line) => SECTION_LABELS.has(line.toLowerCase()));
  for (const line of lines.slice(0, firstSection === -1 ? lines.length : firstSection)) {
    if (line.length < 8 || line.length > 220 || namesMatch(line, name)) continue;
    if (PRONOUNS_PATTERN.test(line) || DEGREE_PATTERN.test(line)) continue;
    if (HEADLINE_SKIP.has(line.toLowerCase()) || isPromoLine(line)) continue;
    return { value: line, strategy: "topcard-card" };
  }

  const fromTitle = titleParts().rest;
  if (fromTitle) return { value: fromTitle.slice(0, 220), strategy: "page-title" };

  const description = metaDescription();
  if (description) return { value: description.split("·")[0].trim().slice(0, 220), strategy: "meta-description" };

  return { value: "", strategy: "none" };
}

// LinkedIn renders visible text in aria-hidden spans next to screen-reader
// copies, so these are read in preference to whole-section textContent, which
// would carry every line twice.
function visibleSpanTexts(scope: Element): string[] {
  const out: string[] = [];
  for (const span of Array.from(scope.querySelectorAll('span[aria-hidden="true"]'))) {
    const text = collapse(span.textContent);
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

// The old #about / #experience anchors are gone from the new profile DOM;
// kept as a fallback for any layout that still has them.
function sectionByAnchor(id: string): Element | null {
  return document.getElementById(id)?.closest("section") ?? null;
}

function experienceCard(): Element | null {
  return cardByKeyPrefix(EXPERIENCE_KEY_PREFIX) ?? sectionByAnchor("experience");
}

// The About card has no key of its own: it is one of the
// profileCardsBelowActivityPart<N> cards, identified by its own heading text.
function aboutCard(): Element | null {
  const byAnchor = sectionByAnchor("about");
  if (byAnchor) return byAnchor;
  for (const card of Array.from(document.querySelectorAll(`[componentkey^="${BELOW_ACTIVITY_KEY_PREFIX}"]`))) {
    if (/^about\b/i.test(collapse(card.textContent))) return card;
  }
  return null;
}

function currentRoleOf(lines: string[]): { value: string; strategy: Strategy } {
  // Live DOM: "Position" then the job title, the company, then the dates.
  const position = linesAfterLabel(lines, POSITION_LABEL).filter((line) => !isPromoLine(line));
  const [positionTitle, positionCompany] = position;
  if (positionTitle && positionCompany && !/\d{4}/.test(positionCompany)) {
    return {
      value: `${positionTitle} at ${positionCompany.split("·")[0].trim()}`,
      strategy: "position-lines",
    };
  }
  if (positionTitle) return { value: positionTitle, strategy: "position-lines-title-only" };

  // Fallback: an Experience card with its own list items, for layouts that
  // still render one.
  const firstItem = experienceCard()?.querySelector("li");
  if (firstItem) {
    const itemLines = visibleSpanTexts(firstItem);
    const [title, companyLine] = itemLines.length > 0 ? itemLines : textLines(firstItem, 4);
    const itemCompany = companyLine?.split("·")[0]?.trim() ?? "";
    if (title && itemCompany) return { value: `${title} at ${itemCompany}`, strategy: "experience-card" };
    if (title) return { value: title, strategy: "experience-card-title-only" };
  }

  // 2. The identity card's "Company · School" line, which follows the
  //    headline. Its first segment is the current company. Degree lines
  //    ("· 1st") have an empty first segment, so they can't match.
  const identityCompany = identityCardLines()
    .filter((line) => line.includes("·"))
    .map((line) => line.split("·")[0].trim())
    .find((segment) => segment.length >= 2 && segment.length <= 60 && !DEGREE_PATTERN.test(segment));
  if (identityCompany) return { value: identityCompany, strategy: "identity-card-company" };

  // 3. A company link in the top card. Live dump: "View company: White Bear"
  //    (the old "Current company:" wording is gone).
  const topcard = cardByKeyPrefix(TOPCARD_KEY_PREFIX) ?? document.body;
  const label = collapse(
    topcard.querySelector('[aria-label^="View company" i], [aria-label^="Current company" i]')?.getAttribute("aria-label") ??
      document.querySelector('[aria-label^="View company" i], [aria-label^="Current company" i]')?.getAttribute("aria-label"),
  );
  const company = label
    .replace(/^(view|current) company:\s*/i, "")
    .replace(/\.\s*click.*$/i, "")
    .trim();
  if (company) return { value: company, strategy: "company-label" };

  return { value: "", strategy: "none" };
}

function aboutText(lines: string[]): { value: string; strategy: Strategy } {
  // Live DOM: an "About" label line, then the About text as the next line.
  const after = linesAfterLabel(lines, ABOUT_LABEL).filter((line) => line.length > 40 && !isPromoLine(line));
  if (after[0]) return { value: after[0].slice(0, ABOUT_MAX_CHARS), strategy: "about-label-line" };

  const section = aboutCard();
  if (!section) return { value: "", strategy: "none" };

  const longest = visibleSpanTexts(section).sort((a, b) => b.length - a.length)[0] ?? "";
  if (longest.length > 20) return { value: longest.slice(0, ABOUT_MAX_CHARS), strategy: "about-aria-hidden" };

  const clone = section.cloneNode(true) as Element;
  clone.querySelectorAll("button, [role='button'], h2, h3").forEach((el) => el.remove());
  const text = collapse(clone.textContent).replace(/^about\s*/i, "");
  return text ? { value: text.slice(0, ABOUT_MAX_CHARS), strategy: "about-section-text" } : { value: "", strategy: "none" };
}

// Reads the profile currently on the page. `control` is the clicked Connect,
// whose invite label is the most reliable source of the name when present.
export function extractProfile(control: Element | null): ProfileExtraction {
  // Page title first: the new profile DOM has no <h1> at all, and the title is
  // present on every layout.
  const fromLabel = nameFromInviteLabel(control);
  // The identity card is live DOM and always belongs to the profile on screen;
  // the page title can lag behind a single-page navigation between profiles.
  const fromCard = nameFromIdentityCard();
  const fromTitle = nameFromPageTitle();
  const fromHeading = collapse(profileHeading()?.textContent);
  const name = fromLabel || fromCard || fromTitle || fromHeading;

  if (fromCard && fromTitle && !namesMatch(fromCard, fromTitle)) {
    console.warn(
      `[content-script] page title says "${fromTitle}" but this profile's card says "${fromCard}" — using the card. LinkedIn navigated without reloading.`,
    );
  }

  const lines = profileLines();
  const headline = headlineOf(name, lines);
  const role = currentRoleOf(lines);
  const about = aboutText(lines);

  return {
    profile: {
      name,
      headline: headline.value,
      currentRole: role.value,
      about: about.value,
      url: window.location.href.split("?")[0],
      capturedAt: Date.now(),
    },
    strategies: {
      name: fromLabel
        ? "invite-label"
        : fromCard
          ? "identity-card"
          : fromTitle
            ? "page-title"
            : fromHeading
              ? "main-h1"
              : "none",
      headline: headline.strategy,
      currentRole: role.strategy,
      about: about.strategy,
    },
  };
}

// ── "Add a note" box ──

// Guesses, most specific first: the classic invitation textarea, then any
// textarea or editor inside an open dialog.
const NOTE_BOX_SELECTORS = [
  '[role="dialog"] textarea[name="message"]',
  "textarea#custom-message",
  '[role="dialog"] textarea',
  '[role="dialog"] [contenteditable="true"]',
];

export function findNoteBox(): HTMLElement | null {
  for (const selector of NOTE_BOX_SELECTORS) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

// Fills LinkedIn's note box. Never clicks Send: the user reviews and sends.
export function insertIntoNoteBox(text: string): { ok: boolean; error?: string } {
  const box = findNoteBox();
  if (!box) {
    return {
      ok: false,
      error: "Couldn't find LinkedIn's note box. Click Connect, then \"Add a note\", then try Insert.",
    };
  }

  box.focus();
  if (box instanceof HTMLTextAreaElement) {
    // Selecting first makes insertText replace any earlier draft. It fires the
    // same input events as typing, so LinkedIn's character counter updates.
    box.select();
    if (!document.execCommand("insertText", false, text)) {
      // React tracks a textarea's value through its prototype setter; setting
      // .value directly would be overwritten on the next render.
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(box, text);
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else {
    if (!document.execCommand("insertText", false, text)) {
      box.textContent = text;
      box.dispatchEvent(new InputEvent("input", { bubbles: true, data: text, inputType: "insertText" }));
    }
  }
  return { ok: true };
}

