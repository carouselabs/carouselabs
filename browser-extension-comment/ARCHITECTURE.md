# CarouseLabs Comment — Architecture

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
  Panel → apiFetch POST /api/ext/{generate,rewrite,connection-note,message}
  → backend: bearer auth → shared daily limit 450 generations/user/24h across
    all extension routes (lib/extDailyLimit.ts, no hourly limit) → credits
    (bypassed while COMMENT_CREDITS_ENFORCED=false) → gpt-6-luna, Claude Haiku
    fallback → number / placeholder / weak-pattern guards → text

Insert (never submits)
  Panel → chrome.tabs.sendMessage(activeTab, {type:"carouselabs:insert-comment", text, mode})
  mode comment|reply → LinkedIn comment/reply editor
  mode connect       → invitation "Add a note" box
  mode message       → DM compose box
  via document.execCommand("insertText"), fallback: set text + dispatch input

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
| `showInsertButton` | Settings | Per-install Insert visibility. |
| onboarding flag | Onboarding | Done/not done. |
| `linkedinSelfName` | content script | User's own LinkedIn display name. |
| `linkedinSelfProfile` | content script | User's own name/headline/role/about. |
| `connectNoteContext`, `connectNoteLength` | panel | Connection-note preferences. |
| `messageContext:<profileUrl>` | panel | Per-contact reason/profile/tone. One key per contact, never pruned. |

Account-level state (profiles, history, settings, credits, `insertWarningHidden`) lives server-side.

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
