# CarouseLabs Engage — Architecture

A Manifest V3 Chrome extension that **writes** LinkedIn comments, comment replies,
connection-request notes and DM replies. It never posts, sends, or clicks
anything on LinkedIn's behalf: every piece of text is either copied by the user
or placed into LinkedIn's own input box ("Insert"), and the user presses
Post/Send themselves.

That matters for testing scope. There is **no automation loop, queue, batch,
scheduler, alarm, or background job** anywhere in the code — so service-worker
restarts cannot interrupt an in-flight batch, and nothing can "double-send".
The real risk classes are instead: text placed into the **wrong** box / for the
**wrong** person, misattributed conversation context, and leaked credentials.

## File map

| File | Role |
|---|---|
| `manifest.config.ts` | MV3 manifest (built by @crxjs/vite-plugin). localhost host permission only in dev builds. |
| `src/background.ts` | Service worker. Sets side-panel-on-click, opens `welcome.html` on first install, stores the auth token relayed from `authRelay`, relays the Alt+Shift+G command to the panel. Stateless. |
| `src/content/authRelay.ts` | Content script on `carouselabs.com/extension-connect` only. Relays the one-time `postMessage` token into the extension. |
| `src/content-script.ts` | Content script on every `linkedin.com` page. One capture-phase click listener detects Comment / Reply / Connect clicks and extracts context; one `onMessage` listener handles Insert, Read-conversation, Read-self-profile. |
| `src/content/replyThread.ts` | Reply-button detection, comment-thread extraction, signed-in member name (`getSelfName`), `sameName`. |
| `src/content/connectNote.ts` | Connect-button detection, profile-page owner check, profile extraction, "Add a note" box insert. |
| `src/content/messageThread.ts` | Conversation read (contact, thread, sender attribution) and DM compose-box insert. Contains a TEMPORARY DIAGNOSTIC block. |
| `src/lib/api.ts` | Bearer-token API client (`apiFetch`), shared response types, API base URL (prod vs dev vs `apiBaseUrl` override). |
| `src/lib/connectionNote.ts` | Shared keys/types/limits for connection notes (280-char cap). |
| `src/lib/messageThread.ts` | Shared keys/types for conversations; per-contact memory (`messageContext:<profileUrl>`); tone list. |
| `src/sidepanel/App.tsx` | Panel shell: sign-in gate, onboarding gate, screen switcher. |
| `src/sidepanel/components/screens/HomeScreen.tsx` | Comment / Reply / Connection-note flow, Insert gating + risk modal, pacing nudge, shortcut. |
| `src/sidepanel/components/ConnectionNotePanel.tsx` | Connection-note mode of Home. |
| `src/sidepanel/components/screens/MessagesScreen.tsx` | Conversation Assistant: read → reason/tone → generate → copy/insert. Owns its own Insert flow. |
| `src/sidepanel/components/screens/*Profiles*.tsx`, `*ProfileForm.tsx` | CRUD UIs for comment / connection / message profiles. |
| `src/sidepanel/components/screens/{History,Settings,Account}Screen.tsx` | History list, settings, account + sign-out. |
| `src/sidepanel/components/ResultCard.tsx` | The generated text and what to do with it (Copy first, Insert, Regenerate), shared by comments, replies, notes and messages. |
| `src/sidepanel/components/ProfileList.tsx`, `form.tsx` | The profile list (delete asks first) and the builder layout (pinned Save), shared by all three kinds of profile. |
| `src/components/ui/*` | Primitives: Button (with `loading`), Textarea (`autoGrow`), Input, Select, Segmented, Switch, Badge, Alert, Tooltip, Skeleton. See "Side panel UI". |

## Message flows

```
Sign-in
  Panel "Sign In" → new tab carouselabs.com/extension-connect
  → web page (Clerk session) POST /api/ext/auth/exchange → { token }
  → window.postMessage({type:"carouselabs:extension-token", token})
  → authRelay.ts (same-origin + source===window check)
  → chrome.runtime.sendMessage → background.ts → storage.local.extensionToken
  → background closes the tab → App.tsx storage.onChanged → signed in

Capture (Comment / Reply / Connect click on LinkedIn)
  click (document, capture phase) → content-script.ts extracts
  → storage.local.lastSelectedPost  (reliable path; survives closed panel)
  → runtime.sendMessage "carouselabs:post-selected" (instant path)
  → HomeScreen (dedupes on capturedAt) + CaptureToast

Generate
  Panel → apiFetch POST /api/ext/{generate,rewrite,connection-note,message,profiles/test}
  → backend: bearer auth → shared daily limit 450 generations/user/24h across
    all extension routes (lib/extDailyLimit.ts, shown as a cooldown, no hourly
    limit) → paywall gate (lib/extAccess.ts, see Paywall below) → gpt-6-luna,
    Claude Haiku fallback → number / placeholder / weak-pattern guards → text
    + freeRemaining (a failed generation gives its free use back)

Generate, streamed (Comment and Reply; the other routes still answer JSON)
  Panel → apiStream POST /api/ext/generate, Accept: text/event-stream
  → every check above runs first; a failure is still a JSON status code
  → SSE: start → text (the comment so far: whole words only, cleaned, never an
    invented figure — that attempt is stopped instead) … → retry (draft
    discarded, panel shows the dots again) → final {comment, historyId,
    freeRemaining, timing} or error {status}
  → the box is read-only with Copy/Insert off until `final`, whose comment
    replaces the draft. Without the Accept header (1.2.0 and earlier) the route
    answers JSON as before.
  → timing: Server-Timing header (JSON), `timing` in `final`, one
    "[ext/generate] timing req=<id>" log line; the panel logs
    "[perf] generate req=<id>" with the same random id (X-Engage-Request-Id),
    so one slow Generate can be followed through both.
  → the panel leaving (Stop, Regenerate, a new post, closing it) aborts its
    request; the server (request.signal, the stream's cancel, or a failed
    write) stops the model call, writes no history row and gives the free use
    back, once. vercel.json turns on Vercel's request cancellation for the two
    streaming routes, and the remaining work is kept alive with after().
    Charged only when the final comment reached a client still listening.
  → length: a clean comment up to 10% past a rough length bucket ("Short
    (1-2 lines)") is kept instead of written again; explicit "N-M characters"
    ranges and X's limit stay exact.
    Benchmark: npm run bench (real models, a few cents; see tests/bench).

Insert (never submits)
  Panel (src/sidepanel/useInsert.ts) → chrome.tabs.sendMessage(activeTab,
    {type:"carouselabs:insert-comment", text, mode, insertId, target | expect})
  mode comment|reply → LinkedIn comment/reply editor
  mode connect       → invitation "Add a note" box: replaces only an empty box
                       or the extension's own unedited note; text the person
                       wrote is left alone and the panel offers "Replace it
                       with this note" (sent again with replace: true)
  mode message       → DM compose box
  - target: the capture's InsertTarget (captureId, the post card's componentkey
    and permalink URN, the comment URNs for a reply), stored with
    lastSelectedPost and sent back untouched. The content script uses its own
    remembered card only for its own capture; otherwise (the card redrawn,
    Insert from another tab, a fresh copy of the script) it finds the post
    again by those ids, and only a single match counts. Never "the first box
    on the page".
  - The box may still be opening: waited for up to 2s (src/content/waitFor.ts),
    then a clear refusal.
  - Typed the way a keystroke is (execCommand "insertText": a trusted input
    event, checked in Chromium), at the end of any draft, then confirmed: the
    box must hold the text, and still hold it after the editor's next redraw
    (src/content/editor.ts). A paste is tried only if nothing changed (so
    text never lands twice); text is never just written into the page. The
    answer is ok only once confirmed; otherwise the text stays in the panel
    for Copy, with why.
  - insertId: one per click. A repeat (the panel resending after a lost
    answer, two copies of the script during an update) gets the first answer
    instead of typing again (src/lib/insertOnce.ts). The panel ignores a
    second click while one runs, and says "Inserted" for 1.5s after.
  - The server's Insert switch is read when the page loads and kept 5
    minutes (src/lib/insertSwitch.ts), so Insert doesn't wait on the network.

Read (on demand)
  Panel → tabs.sendMessage {type:"carouselabs:read-conversation"} → {conversation}
  Panel → tabs.sendMessage {type:"carouselabs:read-self-profile"} → {profile}

Shortcut
  chrome.commands "generate-comment" → background → runtime.sendMessage → HomeScreen
```

## Storage (`chrome.storage.local`, per install)

| Key | Written by | Contents |
|---|---|---|
| `extensionToken` | background | Long-lived bearer token (`cl_cmt_…`). Server stores only its SHA-256. |
| `apiBaseUrl` | developer, manually | Optional API host override. |
| `lastSelectedPost` | content script | Last captured post/reply/connect target (other people's names + post text). |
| `showInsertButton` | Settings | Cache of the account's Insert visibility (`User.insertButtonHidden`). |
| onboarding flag | Onboarding | Done/not done. |
| `linkedinSelfName` | content script | User's own LinkedIn display name. |
| `linkedinSelfProfile` | content script | User's own name/headline/role/about. Cache of `User.linkedinProfile` (newer copy wins). |
| `connectNoteContext`, `connectNoteLength` | panel | Cache of `User.connectNoteContext` / `.connectNoteLength`. |
| `messageContext:<profileUrl>` | panel | Cache of one `ContactContext` row (per-contact reason/profile/tone). |
| `settingsUploadedToAccount` | panel | Set once this browser's old local settings were uploaded to the account. |

Account-level state (profiles, history, settings, paywall state) lives server-side —
and since the website's Extension section, so does everything the panel lets you edit (see
`src/lib/syncedSettings.ts`). The cached keys above are read only when the server can't be
reached. The first time a browser signs in after this change, its old local values are uploaded
once for anything the account doesn't have yet; after that the account always wins, so a
conversation deleted on the website doesn't come back from a local copy.

**Sign out** (`src/lib/account.ts`) removes the token, `lastSelectedPost`,
`linkedinSelfName`, `linkedinSelfProfile`, `connectNoteContext` and every
`messageContext:*` key. It keeps `showInsertButton`, the onboarding flag,
`connectNoteLength` and `apiBaseUrl`.

## External calls

- Extension → `https://carouselabs.com/api/ext/*` (`http://localhost:3000` in dev builds, or `apiBaseUrl`).
  `GET /api/ext/config` is public and fetched by the content script on **every LinkedIn page load**.
- Backend → OpenAI (`gpt-6-luna`, primary), Anthropic (`claude-haiku-4-5-20251001`, fallback), Upstash Redis, Supabase Postgres.
- The extension itself never calls an AI provider and holds no provider keys.

## Permissions

| Permission | Why |
|---|---|
| `sidePanel` | The UI. |
| `storage` | Everything in the table above. |
| `clipboardWrite` | Copy buttons. (Likely redundant — `navigator.clipboard.writeText` from an extension page with a user gesture works without it. Kept; no install warning.) |
| host `https://www.linkedin.com/*` | Content script, `tabs.sendMessage`, reading the active tab's URL. |
| host `https://carouselabs.com/*` | API calls from extension pages; `authRelay` injection. |
| host `http://localhost:3000/*` | Dev builds only. |

No `tabs`, `scripting`, `alarms`, `webRequest`, `cookies`, `externally_connectable`. Default MV3 CSP; no remote code, no `eval`, no inline scripts, no `innerHTML`.

## LinkedIn DOM assumptions

**EN** = relies on English UI text and breaks on a non-English LinkedIn.
**UNVERIFIED** = never confirmed against live markup.

### Feed / comments (`content-script.ts`, selectors also served by `/api/ext/config`)
- Comment button `button[aria-label^='Comment']` **EN**, `button.comment-button`
- Post container `div[role='listitem'][componentkey^='update-card-focus']`; fallback `[componentkey^='update-card-focus']` (outermost), else the page's single match
- Author: `a[href*="/in/"], a[href*="/company/"]` (last before the text); `a[aria-label^="View "][aria-label$="'s profile"]` **EN**; `[componentkey^='feed-header']`; structural span guess
- Name cleanup strips `Follow/Following/1st/2nd/3rd`, `N followers`, `Premium` **EN**
- Post text `[data-testid="expandable-text-box"]` (minus nested `<button>`s)
- Post type by class: `.update-components-image|article|poll`, repost classes (hashed-class risk)
- Permalink `a[href*="/feed/update/"]`
- Comment box `div[contenteditable='true'][role='textbox']`, `div.ql-editor[contenteditable='true']`, `[aria-label*='comment' i]` **EN**

### Replies (`replyThread.ts`)
- Reply control: text or aria-label starting with `Reply` **EN**
- Comment items by componentkey `replaceableComment_urn:li:comment:(…)` / `CommentComponentReference_urn:li:comment:(…)`
- Self name: nav/header `<img alt>`; strips `Photo of`, `'s profile photo` **EN**; must be 2+ capitalised words (fails for scripts without letter case, e.g. Devanagari/CJK/Arabic, and single-word names)

### Connect (`connectNote.ts`)
- Only on `/in/<slug>/`
- Connect control: componentkey `/connectbutton/i`, href `/preload/custom-invite/?vanityName=`, aria-label `Invite X to connect` **EN**, text `Connect` **EN**
- Owner check: vanityName vs URL slug; else invite label vs heading/slug
- Profile cards by componentkey prefixes `profileCardsAboveActivityTopcardOnly`, `profileCardsExperienceOnly`, `profileCardsBelowActivityPart`, `com.linkedin.sdui.profile.card.ref`
- `document.title` = `Name - Headline | LinkedIn`; `og:title`, `og:description`
- Section labels `About`, `Position`, promo-line patterns, `View company:` **EN**
- Note box `[role="dialog"] textarea[name="message"]`, `textarea#custom-message`, any dialog textarea/contenteditable — **UNVERIFIED**

### Messaging (`messageThread.ts`)
- Read and Insert only on `/messaging/…` paths
- Floating chat pop-ups excluded via `[class*="msg-overlay"]`; hidden (display:none) content excluded via `offsetParent`
- Message text `.msg-s-event-listitem__body` (confirmed)
- Sender rows: `[class*='msg-s-message-group__timestamp']` (confirmed) → name from `[class*='msg-s-message-group__name']` (unconfirmed) or the row's `a[href*="/in/"]` text minus `View …'s profile` **EN**. Each row resolved by name (contact vs nav self name), then profile URL, else unknown; messages take the nearest preceding row in document order.
- Contact name `.msg-entity-lockup__entity-title` (confirmed) — no other fallback. Header profile link searched only above the messages.
- Contact headline: `[title]` element echoing its own text near the title (confirmed)
- Compose box `div.msg-form__contenteditable` (confirmed), `[contenteditable][aria-label*='Write a message']` **EN**; never inside a pop-up or hidden thread
- Insert is bound to the thread path + contact name captured at Read

## Paywall

10 free generations per account, for life, then **$15/month unlimited**
(Lemon Squeezy). Every model call counts: Generate, Regenerate, Reply,
Shorter/Longer, connection notes, messages, profile Test. "Unlimited" is
backed by the 450/day cap above, which applies to subscribers too.

| Piece | Where |
|---|---|
| Rules (free count, which statuses are usable, webhook classification) | `lib/extensionAccessRules.ts` (pure, unit-tested) |
| Gate: reserve a free use atomically before the model call, give it back on failure | `lib/extAccess.ts` → every generation route |
| State | `User.extensionTrialUsed`, `ExtensionSubscription` (one per user; never touches the web `Subscription`) |
| Checkout link, stamped with the user's id | `GET /api/ext/checkout` |
| Webhook | `app/api/webhooks/lemonsqueezy` routes extension events to `lib/extensionBilling.ts` **before** any web-plan code |
| Panel | `src/lib/extensionAccess.ts` (shared store, refresh on focus), `UnlockCard.tsx`, Account screen |

- The buyer is identified by `custom_data.user_id` from the checkout link, or
  by the stored subscription id — never by the checkout email.
- An event about an older subscription can't overwrite a newer one; only
  `subscription_created` replaces the stored subscription.
- A cancelled subscription keeps working until `endsAt`; `past_due` keeps
  working while Lemon Squeezy retries the card.
- `COMMENT_CREDITS_ENFORCED=false` (local only) switches the paywall off on the
  server, and `/api/ext/me` reports `access: "testing"` so the panel lifts it too.
- Web plans (Free/Pro/Growth) give the extension nothing, and custom tones
  (custom profiles) are unlimited for everyone.
- Referrers earn 8% of every extension payment (first and renewals), the same
  as for web plans: `subscription_payment_success` → `createCommissionForPayment`,
  keyed by the invoice id so a redelivery can't pay twice.

## Admin control (admin → CarouseLabs Engage)

The admin's **CarouseLabs Engage** group (Overview, Engage users, Free access,
Engage audit log) runs on top of the one $15 plan; there is no plan builder.
Per user, an admin can grant free unlimited access (with an end date or for
life, revocable), switch features off, set limits, change the free-generation
count, reset usage, pause Engage, sign browsers out, and keep notes and tags.

Access is worked out in one place, `lib/engage/accessRules.ts` (pure), in this
order: plan defaults → active subscription → the user's overrides → an active
grant → a pause. Every generation route calls `engagePreflight` and then
`reserveEngageGeneration` (`lib/engage/gate.ts`), so a switched-off feature, a
limit or a pause is refused on the server whatever the panel shows.

| Piece | Where |
|---|---|
| Features, limit keys, plan defaults (450/day, 10 free) | `lib/engage/features.ts` |
| Per-user switches and limits, free count, pause | `EngageUserControl` |
| Free access, incl. for emails that haven't signed up yet | `EngageAccessGrant` (`lib/engage/grantActions.ts`) |
| Per-feature day/month counts (race-safe) | `EngageUsageCounter` (`lib/engage/usage.ts`) |
| Extension version per signed-in browser | `EngageClientInfo` ← `X-Engage-Version` on every request |
| Failures only the panel sees (Insert, Read, unreachable tab) | `EngageClientError` ← `POST /api/ext/errors` (`src/lib/errorReport.ts`) |
| Who changed what, before → after, why | `AuditLog` with `product = "engage"` |
| Admin roles (only the owner today) | `lib/engage/adminAccess.ts` |

- The panel reports codes and fixed descriptions only. The content script's
  own wording can name the person whose page is open, so it never leaves the
  browser.
- **Deploy order:** run `scripts/engage-admin-schema.sql` in Supabase first
  (additive, safe to re-run; `scripts/engage-admin-schema-rollback.sql`
  undoes it). Until it has run, generation falls back to the plan rules
  alone, so deploying early can't lock anyone out.
- A paused account can't generate (its token still signs in, so its history
  stays readable). A deleted or suspended website account's token is refused
  outright.

## On the website (`/extension`)

The website has an **Extension** section (left menu): Overview, Voice
profiles, History, Settings, Plan & payments. It **never generates** —
generation only happens in the extension, on LinkedIn. It manages what the
extension uses:

| Tab | What | Route it calls |
|---|---|---|
| Overview | plan, this month's counts by kind, signed-in browsers (remote Sign out) | `/api/ext/devices` |
| Custom tones | custom profiles for comments, connection notes, conversations (create / edit / delete / default); every-note settings (your context, your LinkedIn profile, note length); each conversation's reason and tone | `/api/ext/{profiles,connection-profiles,message-profiles,settings,contacts}` |
| History | every generation, filter by kind, copy, open on LinkedIn, delete (kept 90 days) | `/api/ext/history` |
| Settings | default language, default voice per kind, Insert button | `/api/ext/settings` |
| Plan & payments | the $15 plan card, payments read live from Lemon Squeezy | `/api/ext/payments` |

**One set of routes.** The website calls the same `app/api/ext/*` routes as
the panel. `getExtensionUser` (`lib/extensionCommentAuth.ts`) accepts the
extension's bearer token *or* the website's Clerk session, so both get the
same validation and plan limits and read the same rows — a change on either
side shows on the other with no sync step. Rules:

- If an `Authorization` header is present, only the token counts (a bad token
  never falls back to a cookie).
- A cookie-authenticated write (POST/PUT/PATCH/DELETE) must carry a
  same-origin `Origin` header.
- Generation routes (`generate`, `rewrite`, `connection-note`, `message`,
  `profiles/test`) stay token-only.

**History covers every kind.** `CommentHistory.kind` is `comment`, `reply`,
`connection_note` or `message`; `profileName` is the name at generation time;
`profileId` is optional (a note or message may use a one-off reason). Notes and
messages return a `historyId`, and the panel marks Copy/Insert on it like it
does for comments. The pacing nudge (`commentsToday`) still counts comments and
replies only.


## Side panel UI

**Tokens, not colours.** Every colour is a CSS variable in
`src/sidepanel/styles.css`, defined once for light and again for dark (dark
follows the OS). Components use the Tailwind names (`bg-card`,
`text-muted-foreground`, `text-primary-text` …), never raw colours, so a theme
change is one file. Purple *text* uses `text-primary-text`; plain
`text-primary` is too dark to read on the dark theme. Every text/surface pair
is held to WCAG AA (4.5:1) in both themes by `tests/unit/designTokens.test.ts`.

**Type, radius, motion.** Screen titles `text-base` semibold, body `text-sm`,
labels and hints `text-xs`, badges 11px (the smallest). Controls `rounded-md`,
cards `rounded-lg`, dialogs `rounded-xl`. Motion is short (`duration-fast`
120ms, `normal` 180ms, `slow` 260ms, ease-out) and switches off under
"reduce motion": the state change still happens, just instantly.

**Patterns.** Generated text always lands in `ResultCard` (Copy is the main
action: the user posts everything themselves). Empty states say what to do
next. Errors use `Alert`, sit next to the action that failed, and a failed
generation turns the button into "Try again". Destructive actions ask first.
Settings apply at once and confirm with "Saved".

**Finding Messages.** Most people never open Messages on their own, so while
the tab beside the panel shows a LinkedIn conversation (`conversationPath`
in `src/lib/tabs.ts`, the address only, never the page): a card at the top
of every other screen ("Write a reply with AI" opens Messages and reads the
conversation; "Not now" hides it for that conversation), a dot on the
Messages icon, and "AI" on the toolbar icon even with the panel closed
(`src/background.ts`). If the tab moves to another conversation after one
was read, Messages offers "Read this one". Nothing is read without a click.

**Checks.** `tests/e2e/theme.spec.ts` (dark mode, reduce motion, hover
labels) and `tests/e2e/qa.spec.ts` (no sideways scroll at 320px, every Tab
stop shows focus) run with the rest of the e2e suite. For design review,
`UI_SCREENS=1 npx playwright test tests/e2e/uiScreens.spec.ts` screenshots
every screen and state at 400 and 320px into `ui-screens/` (`UI_SCHEME=dark`
for the dark theme).
