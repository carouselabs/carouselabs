// src/content/classicPost.ts — LinkedIn's older post layout, which Sales
// Navigator still shows: a post opened there (from a notification or an
// alert) is LinkedIn's own post page in a frame,
// www.linkedin.com/feed/sales-navigator/<urn> (see the top of
// src/content-script.ts). Class names stand in for the newer layout's
// componentkeys, and the post's URN sits on its card. The configured
// selectors (app/api/ext/config) match nothing there, so a card in this
// layout is read with these instead. Checked against a saved Sales Navigator
// post frame (2026-11-13).

export const CLASSIC = {
  // The post card. Comments carry their URN in data-id, never data-urn.
  card: "[data-urn^='urn:li:activity:'], [data-urn^='urn:li:share:'], [data-urn^='urn:li:ugcPost:']",
  // The post's own text (its author's commentary), never a comment's.
  postText: ".update-components-update-v2__commentary, .feed-shared-update-v2__description .update-components-text",
  // One comment: data-id="urn:li:comment:(activity:1,2)". A reply sits inside
  // the comment it answers.
  commentItem: "[data-id^='urn:li:comment:']",
  // A comment's own text, without its author's name, headline or counts.
  commentText: ".comments-comment-item__main-content",
} as const;

// The post's URN, from its card ("urn:li:activity:7123…").
export function classicCardUrn(card: Element | null): string | null {
  return /^urn:li:(?:activity|share|ugcPost):\d+$/.exec(card?.getAttribute("data-urn") ?? "")?.[0] ?? null;
}

const clean = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

// The name in a profile link of this layout. Its link holds the headline and
// "• 2nd" as well, so the link's whole text is no name: the post author's
// sits in the actor's title (shown once, and again for screen readers), a
// commenter's in its own title span. "" for any other link.
export function classicNameIn(link: Element): string {
  const title = link.querySelector(".update-components-actor__title");
  const shown = title?.querySelector("span[dir='ltr'] > span[aria-hidden='true']") ?? title?.querySelector("span[aria-hidden='true']");
  if (shown) return clean(shown.textContent);
  return clean(link.querySelector(".comments-comment-meta__description-title")?.textContent);
}

// The headline under the post author's name, found from either of the
// author's links (photo or name). "" outside this layout.
export function classicHeadline(authorLink: Element | null): string {
  const description = authorLink
    ?.closest(".update-components-actor__container, .update-components-actor")
    ?.querySelector(".update-components-actor__description");
  if (!description) return "";
  return clean((description.querySelector("span[aria-hidden='true']") ?? description).textContent);
}
