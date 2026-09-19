// app/api/ext/config/route.ts — called by browser-extension-comment/'s
// content script (src/content-script.ts) on every LinkedIn page load to get
// the current LinkedIn DOM selectors. Public, no auth: this is just static
// selector config, not user data, and the content script runs before it has
// any way to obtain an extension token's worth of context on a bare page
// load.
//
// FLAG: the selector values below are best-guess/reasonable as of this
// writing and WILL drift as LinkedIn ships DOM changes — they are not
// verified against LinkedIn's live markup. Treat a broken selector as
// expected maintenance, not a bug: watch for reports of the content script
// silently finding nothing (see content-script.ts's console warnings) and
// update the strings here — no extension redeploy needed since the content
// script re-fetches this on every page load.
//
// CORS: unlike the rest of app/api/ext/*, this route is fetched directly
// from the LinkedIn PAGE's context (content-script.ts calling plain
// fetch()), not from an extension page — so it's a genuine cross-origin
// request from https://www.linkedin.com and needs real CORS headers; the
// host_permissions-based CORS bypass that lets src/lib/api.ts's apiFetch
// call these routes unadorned from the side panel does not apply here.
// The OPTIONS handler and Access-Control-Allow-Private-Network header exist
// specifically for local dev: Chrome's Private Network Access policy
// preflights (and requires explicit opt-in for) any request from a public
// page to a private-network address like localhost, which is what surfaced
// this — production (carouselabs.com) isn't a private address so PNA never
// triggers there, but the plain CORS headers are still required in both.
import { NextResponse } from "next/server"

// Content script only ever runs on linkedin.com (manifest.config.ts's
// content_scripts matches) — no need to reflect an arbitrary Origin.
const ALLOWED_ORIGIN = "https://www.linkedin.com"

function withCorsHeaders(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
  res.headers.set("Vary", "Origin")
  return res
}

// OPTIONS /api/ext/config — the PNA preflight Chrome sends before a public
// page can reach a private-network address (localhost, in dev). Also
// satisfies a normal CORS preflight if the browser ever sends one for other
// reasons; harmless either way since this route has no side effects.
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 })
  withCorsHeaders(res)
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  // The actual PNA opt-in — without this, Chrome blocks the follow-up GET
  // when the target address is private (e.g. localhost) and the requesting
  // page's origin is public (linkedin.com).
  res.headers.set("Access-Control-Allow-Private-Network", "true")
  return res
}

// GET /api/ext/config
export async function GET() {
  const res = NextResponse.json({
    // Matches the (icon-only) comment action button in a post's social
    // action bar. aria-label-based rather than class-based on purpose —
    // LinkedIn's class names are frequently hashed/obfuscated, aria-labels
    // are comparatively stable for a11y reasons.
    commentButtonSelector: "button[aria-label^='Comment'], button.comment-button",
    // Nearest ancestor that represents one whole feed post. Confirmed
    // against LinkedIn's live DOM: role="listitem" plus a componentkey
    // starting "update-card-focus" matches exactly one post — not the
    // surrounding feed list, and not a recommendation carousel. Deliberately
    // attribute-based: LinkedIn's class names are per-build hashes
    // ("_83f42d93_f5") and are unusable as anchors, whereas the ARIA role and
    // the componentkey tracking attribute both survive a restyle.
    postContainerSelector: "div[role='listitem'][componentkey^='update-card-focus']",
    // The author's name is not rendered into any attribute-anchored text
    // node — it only exists inside this link's aria-label ("View Si Conroy's
    // profile"), so content-script.ts parses the name out of the label
    // rather than reading textContent. Keep the "View "/"'s profile" wording
    // here in step with AUTHOR_LABEL_PATTERN in content-script.ts.
    //
    // A repost carries TWO such links (resharer, then original author), so
    // the content script picks the last one occurring BEFORE the post text
    // rather than the first or last in the container.
    // Primary author anchor. A profile URL is the most consistently present
    // signal: it survives the case where the <a> itself has no aria-label
    // because the label sits on a nested <svg>. content-script.ts reads the
    // display name from the link's text (the href only carries a slug).
    authorProfileHrefSelector: 'a[href*="/in/"], a[href*="/company/"]',
    // Second-tier anchor, for markup where the href pattern is absent.
    authorLinkSelector: `a[aria-label^="View "][aria-label$="'s profile"]`,
    // Second-tier author anchor. Some post types render the author as bare
    // text in a <span> with no aria-label and no href, so there is nothing
    // on the name itself to match — this anchors on the surrounding header
    // block instead and takes the first short span inside it.
    //
    // UNVERIFIED: the "feed-header" prefix has not been confirmed against a
    // live dump; if the componentkey list logged by content-script.ts on a
    // failed extraction shows a different prefix, correct it here — no
    // extension redeploy needed.
    authorHeaderSelector: "[componentkey^='feed-header']",
    // Span holding the (possibly visually-truncated) post body. data-testid
    // is LinkedIn's own test hook, so it survives their CSS hashing.
    // Their "…see more" is a line-clamp toggle, not a lazy-load — the full
    // text is already in this element's DOM at click time.
    postTextSelector: '[data-testid="expandable-text-box"]',
    // No headline selector by design: the author's headline has no stable
    // anchor of any kind, so content-script.ts derives it structurally from
    // the author link on a best-effort basis and leaves it empty on failure.
    // Presence of any of these inside the post container is how
    // content-script.ts classifies post type (checked in this order).
    imageIndicatorSelector: ".update-components-image",
    articleIndicatorSelector: ".update-components-article",
    pollIndicatorSelector: ".update-components-poll",
    repostIndicatorSelector:
      ".update-components-mini-update-v2, .feed-shared-reshared-update-v2, .update-components-actor--reshared",
    // LinkedIn's own comment input for a post. It is a contenteditable, not a
    // <textarea>, so insertion goes through the editable element rather than
    // a value assignment. Scoped to the post container at use time.
    //
    // UNVERIFIED against live markup, same caveat as the selectors above: the
    // aria-label wording is a best guess and may need correcting here.
    commentBoxSelector:
      "div[contenteditable='true'][role='textbox'], div.ql-editor[contenteditable='true'], div[contenteditable='true'][aria-label*='comment' i]",
    // Remote kill switch for the Insert feature. When false the side panel
    // hides the Insert button entirely, regardless of the user's own setting,
    // so the feature can be withdrawn without an extension redeploy.
    insertEnabled: true,
  })
  return withCorsHeaders(res)
}
