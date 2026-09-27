# CarouseLabs Comment — Test Report

Scope: the Chrome extension (`browser-extension-comment/`) plus the backend
pieces it depends on at runtime (`lib/ai/commentModel.ts`,
`lib/ai/prompts/messagePrompt.ts`, and the paywall: `lib/extAccess.ts`,
`lib/extensionAccessRules.ts`, `lib/extensionBilling.ts` and the Lemon Squeezy
webhook's routing). All LinkedIn testing is against local
fixtures in `tests/fixtures/linkedin/`; nothing touches a live account, and
the E2E harness aborts any request that isn't a fixture or a canned API reply.

## How to run

```
npm run test:unit       # Vitest + jsdom — 195 tests
npm run test:coverage   # same, with coverage
npm run test:e2e        # builds dist/ (dev mode), then Playwright in real Chromium — 11 tests
npm test                # both
```

## Result

| Suite | Before fixes | After fixes |
|---|---|---|
| Unit (Vitest, 11 files) | 26 failed / 82 passed | **109 passed** |
| Unit, after the paywall (14 files) | — | **149 passed** |
| Unit, after the website Extension section (16 files) | — | **166 passed** |
| Unit, after moving the extension's settings to the account (18 files) | — | **188 passed** |
| After LinkedIn's new Messaging layout (frame) | — | **193 unit + 11 E2E passed** |
| After unlimited custom tones + referral commission on extension payments | — | **195 unit + 11 E2E passed** |
| E2E (Playwright, real Chromium, extension loaded) | 4 failed / 5 passed | **9 passed** |
| Typecheck (extension + backend) | clean | clean |
| Production build | — | no diagnostics, no localhost, permissions unchanged |

Every fix has a test that failed on the original code and passes now. Two of
the fixes were re-broken on purpose afterwards (the DM thread-path guard and
the Insert kill switch) to confirm the tests catch a regression — both did.
The paywall got the same treatment: disabling the webhook's extension routing
fails 4 tests, removing the atomic free-use guard fails 3, and accepting any
402 as the paywall fails 1. For the website section: removing the same-origin
check on cookie writes fails 1, letting a bad token fall back to the website
session fails 2, and letting History link to non-LinkedIn URLs fails 1.
Dropping the userId scope from deleting a history row, forgetting a
conversation, or signing out a browser each fails 1 (the test database fakes
Prisma's real `where` behaviour, so a missing scope can't be hidden by the
fake), and running the settings upload more than once fails 1.

Coverage (unit): `messageThread.ts` 87% lines, `editor.ts` 100%,
`authRelay.ts` 94%, `api.ts` 87%, `background.ts` 82%, `connectNote.ts` 70%,
`replyThread.ts` 66%. Side-panel screens are mostly untested (33% overall) —
see "Not tested automatically".

## What this extension is — and why some requested categories don't apply

The extension **writes** text; it never posts, sends, clicks Connect, or acts
on LinkedIn by itself. Every item reaches LinkedIn only when the user presses
Post/Send. There is no queue, batch, scheduler, alarm, timer or background job
(verified: no `alarms`/`scripting` permission, no `setInterval`, no
`MutationObserver`, stateless service worker).

So these categories were checked and are **not applicable**, rather than passed:

| Category | Why N/A |
|---|---|
| Queue/state surviving worker death, alarms surviving restart | No queue, no alarms. The worker holds no state (a unit test proves a restarted worker loses nothing). |
| Duplicate sends / idempotency mid-batch | Nothing sends. A double Insert can put the same text in a box twice (L9); the user sees it. |
| Human-like delays, stop on captcha/restriction | Nothing is automated. Brakes: a daily cap of 450 generations per user (all features combined, no hourly limit), a 50/day pacing nudge, the Insert risk warning, and the server kill switch (now enforced at Insert time — H2). |
| Placeholders `{firstName}`, `{company}` | Not used — every note is written per person by the model. |
| MutationObserver leaks, feed jank | No observers; one delegated click listener registered once per page load. |

## Bugs found

Severity follows the brief: **Critical** = wrong recipient, account-ban risk,
data/key leak. Because nothing auto-sends, "wrong recipient" here means text
written for person A is placed, one click from Send, in person B's box — or the
model is told the user said things someone else said.

| ID | Area | Bug | Severity | How to reproduce | Root cause | Fix | Status | Test |
|---|---|---|---|---|---|---|---|---|
| C1 | DMs | Insert filled whatever conversation was open *now*, not the one that was read. | Critical | Read Bharti's thread, Generate, click another conversation, Insert → Bharti's reply lands in the other person's box. | The Insert message carried only the text. | Read returns the thread path; Insert sends it back with the contact's name, and the content script refuses on any mismatch. | **Fixed** | `messageThread.test` "refuses when a different conversation…", "…name no longer matches…"; E2E "refused after switching threads" |
| C2 | DMs | "You"/"Them" inverted when the thread header had no profile link, so the model wrote in the contact's voice. | Critical | Header link removed → `[them, me, them, them]`. | Contact URL was the first `/in/` link walking up from the title, which reached the user's own message row; every non-matching sender was then "me". | Each sender row resolves by name (contact vs signed-in user) first, URL second, otherwise unknown. The header link search stops before the messages. A header URL that name-resolution says is the user's is discarded. | **Fixed** | "still attributes correctly when the thread header has no profile link", "never inverts … user's own profile" |
| C3 | DMs | In group chats, every participant but one was labelled as the user. | Critical | `messaging-group.html` → Tom's message was "me". | 1:1 assumption. | Name resolution handles groups; the "only two people" inference is never applied to groups. | **Fixed** | "does not attribute another participant's messages to the user" |
| C4 | DMs | An open chat pop-up's messages (another person) were read into the current thread as the user's. | Critical | Unit + real Chromium: Chris's message appeared as "me". | Exclusion matched `overlay-bubble` (only the pop-up header), not `msg-overlay-conversation-bubble`. | Exclude anything under `msg-overlay*`; Read only on `/messaging/`; Insert never targets a pop-up or hidden box. | **Fixed** | "reads only the open thread's messages…", "never falls back to a chat pop-up's…"; E2E read |
| C5 | Comments | Insert with no capture on this page wrote into the first editable box on the page — another post's, or a chat pop-up's DM box. | Critical | Feed, no Comment click, Insert → text in post 2's box; remove it → text in Chris's DM box. | `(lastPostContainer ?? document).querySelector(...)`; the generic contenteditable selector also matches DM boxes. | Refuse without a live capture; search only inside the captured post; skip DM boxes and reply boxes. | **Fixed** | "refuses when this page never captured a post", "never lands a comment in a chat pop-up's message box" |
| C6 | Connect | Note Insert filled whatever invitation dialog was open, for anyone. | Critical | Connect on Jane → Connect on sidebar "John Roe" → Insert → Jane's note in John's invite. | No target check. | The panel sends the target's profile URL; Insert refuses unless that profile is open and the last Connect clicked was for them. | **Fixed** | "refuses after a Connect for someone else…", "refuses on a different person's profile" |
| H1 | Connect | A note over the account's limit (Free 200, Premium 300; the app allows up to 280) was cut mid-word by LinkedIn while Insert reported success. | High | Real Chromium: `execCommand` into a `maxlength` box returns `true`, value `"Hello Jane — really "`. | No check against the box. | Refuse and name the box's limit. See Q1. | **Fixed** | "refuses a note longer than the box allows"; E2E |
| H2 | Insert | The server kill switch `insertEnabled` wasn't enforced where Insert happens. | High | Config `insertEnabled:false` → Insert still fills the box. | Panel read the config once on open; the content script never checked. | Content script fetches the config fresh at Insert and fails closed. | **Fixed** | both "honours the server kill switch" tests |
| H3 | DMs | Read on `/messaging/` with no thread open returned contact **"Messaging"** (seen live). | High | `messaging-inbox-empty.html`. | Page-title fallback. | Page-title and avatar fallbacks removed (avatars also appear in the conversation list, for other people); Read refuses with "No conversation is open". | **Fixed** | "refuses when no conversation is open…" |
| H4 | Account | A revoked/expired token locked the user in: no Sign out button, and sign-out's 401 was treated as a failure. | High | `/me` → 401. | Sign out rendered only after `/me` loaded. | Sign out always shown; 401 from sign-out = already signed out, token cleared. Other errors still keep the token. | **Fixed** | `AccountScreen.test` (3 cases) |
| H5 | Insert | Inserted text went *in front of* a draft the user had typed (and the comment fallback replaced it). | High | Real Chromium probe: `"INSERTEDLove this."`. | `focus()` leaves the caret at the start. | Shared `insertTextAtEnd`: caret to the end of the last text block, separating space, append-only fallback. Used by comment, reply and DM Insert. | **Fixed** | "keeps a draft…" (DM + comment); E2E "keeps a comment the user already typed" |
| M1 | Security | The service worker logged the full auth token and every broadcast message (captured posts, DM text). | Medium | Unit test on `console.log`. | `console.log("…message:", message)`. | Logs no message content. | **Fixed** | "never writes the token…", "does not echo other extension messages…" |
| M2 | Privacy | The page console got other people's DM text, names and markup on every Read, plus full captured posts and profiles. | Medium | Read a conversation, open DevTools. | Diagnostics always on. | Development builds only; verified absent from the production bundle. | **Fixed** | production-bundle grep (0 matches) |
| M3 | Security | The token hand-off was accepted from any extension context, not only the sign-in page. | Medium | A token message from a linkedin.com sender was stored. | `sender` wasn't checked. | Require the `/extension-connect` page on carouselabs.com (plus localhost in dev builds). | **Fixed** | "rejects a token message that did not come from the sign-in page" |
| M4 | Network | No client timeout: a hung backend left "Generating…" spinning indefinitely. | Medium | Never-resolving fetch. | `fetch` without abort. | 120 s abort → "The server took too long to respond." | **Fixed** | "gives up with a clear error when the server never answers" |
| M5 | UX | After an extension update, open LinkedIn tabs had no content script, and the panel said "Open a LinkedIn … in the active tab" to someone already on one. | Medium | Reload the extension, don't reload the tab, click Read. | Chrome doesn't re-inject into existing tabs. | Says "This LinkedIn tab needs a reload" when the tab is LinkedIn (Read, DM Insert, comment/note Insert). | **Fixed** | Manual (see checklist) |
| M6 | i18n | Capture relies on English UI text (`Comment`, `Reply`, `Connect`, `Invite … to connect`, `View …'s profile`, `Write a message`, `Following`, `followers`, `About`/`Position`). Non-English LinkedIn fails silently. | Medium | Switch LinkedIn's language. | Text-based selectors. | Needs structural anchors or per-locale strings. | Won't fix now | — |
| M7 | i18n | Own-name detection needs 2+ capitalised words: never matches single-word names or caseless scripts (Devanagari, CJK, Arabic). | Medium | Self name "राहुल शर्मा". | `\p{Lu}` pattern. | Not fixed. For DMs it is now softened: in a 1:1 thread, once the contact's rows are known, the only other sender is taken as the user. | Partly mitigated | — |
| M8 | Network | Model calls used SDK defaults (10-minute timeout, 2 retries each), so one Generate could run for many minutes. | Medium | Slow upstream. | Client defaults. | 30 s timeout, 1 retry, on both OpenAI and Anthropic clients. | **Fixed** | Typecheck only (no live model calls in tests) |
| B1 | DMs | When the user's own message was the latest one, the model replied *as the contact* ("Thanks for the birthday wishes!"). Seen live. | High | Thread ending in the user's own message. | Nothing told the model the ball was still in its court. | The prompt now says outright when the latest message is the user's and unanswered. Backstop to C2. | **Fixed** | `messagePrompt.test` "tells the model when the latest message is the user's own…" |
| L1 | Storage | `messageContext:<profileUrl>` keys are never pruned. | Low | — | One key per contact. | ~20k contacts before the 10 MB quota. | Won't fix now | — |
| L2 | Privacy | Sign out left cached personal data (own profile/name, "your context" purpose, per-contact memory) — the next account on the browser inherited it, and its notes would be written as the previous person. | Low | — | Only token + last post were removed. | Sign out clears all of it; device settings stay (`src/lib/account.ts`). | **Fixed** | "clears the person's cached data on sign out…" |
| L3 | Security | History "View post" opened a server-supplied URL without checking it was LinkedIn. | Low | — | No check. | Only `https://www.linkedin.com/…` gets the button. | **Fixed** | — |
| L4 | Config | If the first config fetch fails, fallback selectors stick until the page reloads. | Low | — | Promise cached once. | Kill switch is now re-checked at Insert (H2); selectors unchanged. | Won't fix now | — |
| L5 | Credits | Rapid Alt+Shift+G can start two generations (a double charge once credits are enforced). | Low | — | No in-flight guard on the shortcut path. | — | Won't fix now | — |
| L6 | Backend | Refusal detector flags normal text ("I won't lie, this is great"), wasting a fallback call. | Low | — | Substring match anywhere in the first 300 chars. | — | Won't fix now | — |
| L7 | Manifest | `clipboardWrite` is probably unnecessary. | Low | — | — | Left in; no install warning. | Won't fix now | — |
| L8 | Privacy | The content script calls `/api/ext/config` on every LinkedIn page load. | Low | — | Eager prefetch. | — | Won't fix now | — |
| L9 | Insert | Pressing Insert twice inserts twice. | Low | — | — | Visible to the user. | Won't fix now | — |
| L10 | Lint | 3 pre-existing `react/no-unescaped-entities` errors in `HistoryScreen.tsx` copy text. | Low | `npx eslint` | Quotes in JSX text. | Style only; left as-is. | Won't fix now | — |

## Behaviour changes you'll notice

- **Insert refuses more often, on purpose.** After reloading LinkedIn, clicking Connect for someone else, or switching conversations, Insert now asks you to click Comment/Connect again or re-read the conversation, instead of guessing.
- **Read conversation** works only on LinkedIn's full Messaging page with a conversation open — not in the chat pop-ups.
- **Messages the extension can't attribute** show as `?` rather than a guess. The model is told they're unresolved.
- **Over-limit notes** aren't inserted; the error names your account's limit.

## Not tested automatically — manual checklist

Run these on your real account, with DevTools open on the LinkedIn tab (dev build shows `[DIAG message]` lines):

1. **Messaging, sender labels.** Open a 1:1 thread where both of you have written. Re-read. Every message should show `You:` or `Them:` correctly — including a run of several messages from one person. If any show `?`, paste the `[DIAG message] sender rows` block.
2. **Messaging, wrong-thread guard.** Read thread A, Generate, click thread B in the left list, Insert → must refuse and name A's contact. Go back to A → Insert works.
3. **Messaging, chat pop-up.** With a chat pop-up expanded for someone else, Read on the Messaging page → the pop-up's messages must not appear.
4. **Messaging, group chat.** Read a group conversation → other participants must not show as `You:`.
5. **Messaging, draft.** Type a few words in the message box, Insert → your words stay first, generated text after.
6. **Connection note, Free account.** Generate a long note (Custom length near 280), Insert → should refuse with "allows 200". With Premium the limit shown should be 300.
7. **Connection note, "Add a note" box.** Insert has never been verified against LinkedIn's real invitation dialog (it's still UNVERIFIED in `connectNote.ts`). Confirm the note lands in the box and the counter updates.
8. **Connection note, wrong person.** Generate for the profile owner, click Connect on a "People also viewed" card, Insert → must refuse.
9. **Comment, after reload.** Capture a post, reload LinkedIn, Insert → must refuse ("Click Comment on the post again").
10. **Comment, draft + real editor.** Type in a comment box, Insert → both texts present, and LinkedIn's Post button enables (proves LinkedIn's editor registered the input).
11. **Extension update mid-session.** Reload the extension at `chrome://extensions` without reloading LinkedIn, click Read or Insert → message says to reload the tab.
12. **Kill switch.** Set `insertEnabled: false` in the config route, then Insert with the panel already open → refused.
13. **Revoked token.** Revoke the token server-side, open Account → Sign out still appears and works.
14. **Non-English LinkedIn** (M6): switch LinkedIn's language, confirm which captures stop working.
15. **Dark mode, zoom 150%, narrow window** on the side panel: layout readable, output visible after Generate.
16. **Live model behaviour** (not covered by tests): a thread ending in your own message → the reply must be a follow-up from you, not a thank-you from them.

## Decisions

- **Q1 — over-limit note:** keep refusing and naming the account's limit (no automatic trimming).
- **Q2 — chat pop-ups:** not answered; the Conversation Assistant stays on the full Messaging page only.
- **Q3 — sign out:** clears the person's data, keeps device settings (L2, fixed).
- **Q4 — note Insert:** keeps replacing what's in the note box. Appending would garble a 200–300 character note and usually overflow the limit. The replace goes through the browser's own editing, so **Ctrl+Z restores what the user had typed** (E2E test).
- **Q5 — limits:** no hourly limit. One daily cap of **450 generations per user per rolling 24 hours**, shared by Generate, Regenerate, Shorter/Longer, connection notes, messages and profile Test (`lib/extDailyLimit.ts`). Over the cap, the panel shows a cooldown message ("You've been generating a lot today, so we've paused things for a bit…") rather than a number, since the $15 plan is sold as unlimited. Not covered by automated tests (it needs Upstash Redis); confirm on the manual checklist.

- **Q6 — pricing:** 10 free generations per account for life (every feature counts, profile Test included), then $15/month, shown as "unlimited" with the 450/day cap behind it as a cooldown. Everyone pays the $15, including web Pro/Growth subscribers. The paywall's server logic and webhook routing are unit-tested against a mocked database; the real Lemon Squeezy round trip is on the manual checklist (18–22).

## Manual check for the daily limit

17. **Daily limit.** Temporarily set `EXT_DAILY_GENERATION_LIMIT` to 3 in `lib/extDailyLimit.ts`, generate 4 times across different features (comment, note, message) → the 4th shows the daily-limit message. Set it back to 450.

## Manual checks for the paywall

Needs the Lemon Squeezy product in **test mode**, the env vars set, the SQL in
`scripts/extension-schema.sql` run, and `COMMENT_CREDITS_ENFORCED=false`
**removed** from `.env.local` (otherwise the paywall is off).

18. **Free count.** New account → Home shows "10 of 10 free generations left". Generate once → 9. Shorter → 8. A failed generation (stop the server mid-request) doesn't lower it.
19. **Paywall.** Use up the 10 → Generate is replaced by the unlock card on Home, Connection note and Messages; Shorter/Longer are disabled; Copy and Insert still work.
20. **Checkout.** "Get unlimited — $15/month" opens Lemon Squeezy with your email filled in. Pay with a test card, come back to the panel → it unlocks (or press "Already subscribed? Refresh"). In Supabase, `ExtensionSubscription` has your row and your web `Subscription` row is **unchanged**.
21. **Account.** Shows "Unlimited" and a renewal date; "Manage subscription" opens the Lemon Squeezy portal. Cancel there → "Unlimited until <date>".
22. **Renewal / expiry.** In Lemon Squeezy test mode, trigger a renewal and an expiry → the renewal leaves your web plan and credits alone; the expiry brings the paywall back.

## Manual checks for the website's Extension section

Needs `scripts/extension-schema.sql` run first. Sign in on the website and
have the extension signed in to the same account.

23. **Left menu → Extension** opens Overview: plan, this month's counts, and your browser under "Signed-in browsers".
24. **Custom tones both ways.** Create a comment profile on the website → open the panel's Profiles screen → it's there. Edit it in the panel → reload the website → the edit shows. Same for a connection note and a conversation profile.
25. **Default.** "Make default" on the website → the panel preselects it on the next Comment click.
26. **History.** Generate a comment, a connection note and a message in the extension, Copy one and Insert one → all three appear on the website's History with the right type and "Copied"/"Inserted". Filters narrow the list; Delete removes a row (and it's gone from the panel too).
27. **Settings.** Change the default language on the website → the panel's Settings shows it.
28. **Remote sign out.** Overview → Sign out your browser → the panel drops to Sign in on its next action.
29. **Payments.** After a test purchase, Plan & payments lists it with an invoice link.
30. **Nothing generates on the website.** There is no Generate or Test button anywhere in the section.
31. **Old settings carried over.** In a browser that already had a note purpose, note length and some conversation reasons saved, reload the extension and open it → the website's Custom tones shows the same purpose, length and conversations.
32. **Note settings both ways.** Change "Your context", your profile's headline, or the note length on the website → the extension's next connection note uses them. Change them in the panel → the website shows the change after a reload.
33. **Conversations.** Change a person's reason or tone on the website → reopen that chat in the extension → it's preselected. Forget them on the website → the extension asks for a reason again next time.
34. **Insert button.** Untick "Show the Insert button" on the website → Insert disappears from the panel after reopening it.

## LinkedIn's newer design (found 2026-09-27)

On accounts with LinkedIn's newer page design, `/messaging/thread/<id>/` is a
new shell page (hashed class names, a hidden feed with its own comment editor)
with the classic Messaging app inside a full-screen, same-origin frame:
`<iframe data-testid="interop-iframe" src="/preload/?_bprMode=vanilla">`. The
reader looked only at the page, so every read said "No conversation is open".
It now reads the frame when the page itself shows no thread
(`messagingDocument()` in `src/content/messageThread.ts`), and Insert types into
the frame's own message box. Fixture: `messaging-new-shell.html` (with
`messaging-thread.html` loaded into the frame). Unit and real-Chromium tests
cover read, Insert, the thread-switch refusal, and never touching the hidden
feed's comment box.

When LinkedIn shows only the chat list (a narrow tab — the side panel takes
width), the thread exists but is hidden; the panel now says so instead of
"No conversation is open".

35. **New design, live.** On LinkedIn Messaging with a chat open, Read → the contact and messages load. Insert → text lands in that chat's box.

