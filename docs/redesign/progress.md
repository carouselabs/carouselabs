# Redesign progress

Branch: `redesign` (from `main` at 54b453a). Nothing committed yet.

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Design system, kit, preview, records | Built 2026-10-11. Owner kept the system, **rejected the sample layouts** |
| 0b | Two structural layout directions (landing opening, Generate, creation screen; desktop + mobile) | Owner chose A + B's mobile tab bar and Go to… (2026-10-11) — see `layout-directions.md` |
| 1 | Landing page | **Built, awaiting review** (2026-10-11) — see Phase 1 below |
| 2 | Other public pages, auth, onboarding | **Built, awaiting review** (2026-10-11) — see Phase 2 below |
| 3a | App frame + Generate, Work on Own Idea, History, Pinned | **Built, awaiting review** (2026-10-11) — see Phase 3a below |
| 3b | Idea page + caption, image, carousel creation | **Built, awaiting review** (2026-10-11) — see Phase 3b below |
| 4a | Engage for LinkedIn / X + Settings | **Built, awaiting review** (2026-10-12) — see Phase 4a below |
| 4b | Content Hub + Ideas Board, Toolkit, Thumbnail, Intern Points | **Built, awaiting review** (2026-10-12) — see Phase 4b below |
| 5a | Admin: shell, kit, Dashboard, Users, User Profile, Subscriptions, Posts, Credits, Referrals, Tasks, Analytics, Audit Logs, Settings, Pre-fill Profile | **Built, awaiting review** (2026-10-12) — see Phase 5a below |
| 5b | Admin: Engage admin, Interns, Broadcasts, Sequences, Scheduled Emails | **Built, awaiting review** (2026-10-12) — see Phase 5b below |

## Phase 0 — what was built

- **Tokens** in `app/globals.css`: light + dark colors, named type scale, radius, elevation, layout widths, gutters, motion, z-layers. Dark is opt-in per subtree (`data-theme`), so live pages are unaffected. Decisions in `design-system.md`.
- **Fonts** `lib/fonts.ts` (Geist, Instrument Serif), loaded only where a layout opts in. **Motion** constants `lib/motion.ts`.
- **`cn()`** taught the new names (`lib/utils.ts`).
- **Kit**: 14 existing primitives upgraded, 10 added (FormField, Select, Checkbox, Switch, RadioGroup, Tooltip, Popover, ConfirmDialog, Drawer, Toast). 15 patterns in `components/patterns/`.
- **Preview** `/design-preview` (`app/(internal)/design-preview/`), development only: brand, color, type, layout/motion, every control in every state, feedback, overlays, navigation, data, product patterns, three sample screens (landing hero, Generate, admin users) with labeled example data, and the records.
- **Proposed mark** (`components/patterns/BrandMark.tsx`) — shown only in the preview.
- **Records**: `route-inventory.md`, `copy-ledger.md`, `landing-structure.md`, `asset-checklist.md`, `design-system.md`.

## Changes that reach live pages in Phase 0

Small and intentional:

- The five live dialogs ("Generate Carousel?" and the LinkedIn "separate images" heads-up in the carousel flow, "Ready to work on this idea?", "Cancel your Pro subscription?", "Lock in this format?") and the sidebar user menu use the upgraded kit: new radius, padding, overlay and focus treatment. Their text and behavior are unchanged. Not checked visually — they need sign-in.
- Bare `border` (no color class) uses the new border token (#E5E3DE → #DED8CD).
- Focus outline color #7C3AED → #6D28D9 (stronger contrast).
- `proxy.ts`: `/design-preview` added to the public list so a signed-out local browser can open it; the page itself returns 404 outside `next dev`.
- `eslint.config.mjs` and `.gitignore`: ignore `.next-redesign/` (local dev build folder).

Measured on six public pages at 375/768/1440 before vs after: 0.000–0.039% of pixels differ (animation timing only).

## Verification (2026-10-11)

| Check | Result |
| --- | --- |
| Baseline before edits | lint 0 errors / 16 warnings · typecheck pass · 272/272 unit tests |
| Typecheck | pass |
| Lint | 0 errors, same 16 pre-existing warnings in the same 12 files |
| Unit tests | 272/272 pass |
| Production build (`next build`) | pass. `npm run build`'s `prisma generate` step failed only because a running dev server locked the Prisma engine file (Windows EPERM); schema unchanged |
| `/design-preview` in production build | 404, "This page could not be found", `noindex`, no preview content in the response |
| `/design-preview` in dev | 200, 0 console errors, no horizontal overflow at 360/375/768/1440/1920 in light and dark |
| Keyboard / screen reader smoke | skip link first; dialog traps focus, Escape closes, focus returns; confirm dialog focuses Cancel; option cards move with arrow keys; empty submit focuses the field and links the error; pin exposes aria-pressed |
| Contrast | all text pairs ≥ 4.5:1, control edges ≥ 3:1, both themes |

Screenshots (git-ignored): `audit-artifacts/redesign/baseline/screens/`, `audit-artifacts/redesign/phase-0/` (full pages), `…/phase-0/sections/` and `…/sections-dark/` (sample screens).

**Not verified:** signed-in app and admin pages (need sign-in; unchanged except the shared dialogs/menu above), 200% browser zoom (reflow covered by the 360–768 checks), Lighthouse/performance (no live page's loading changed in Phase 0; measured in Phase 1).

## Open decisions for the Phase 0 review

1. Approve the warm editorial direction, or name the element to change.
2. Approve the landing order (`landing-structure.md`).
3. Which copy-ledger rows are approved? Is "1,000+ creators" verified?
4. Keep the current logo or adopt the proposed mark (separate choice).

## How to view

```powershell
cd C:\Users\anant\carouselabs
npm run dev
```

Open http://localhost:3000/design-preview — use the Light / Dark / System switch at the top right.

## Phase 1 — landing page (2026-10-11)

Approved direction: A's workspace structure, B's mobile tab bar and Go to… search (app phases), and for the landing page A's interactive product demo with B's switch in the Engage section, compact header. **Layout only:** logo and all unapproved copy unchanged (see copy-ledger.md, Phase 1).

**Built**

- Header (`components/landing/Navbar.tsx`): 56px, transparent until scroll; Product · Engage · Pricing · Resources · Contact as disclosure lists (not an app menu); mobile drawer loaded on demand (`MobileMenu.tsx`). Shared by every marketing page.
- Hero (`Hero.tsx` + `ProductStage.tsx`): headline row, then the clickable four-step product demo (`#how-it-works`), arrow-key tabs, example content labeled.
- Features (`FeaturesGrid.tsx`): editorial list with a sticky heading.
- Engage (`EngageSection.tsx`): one section, "Engage for LinkedIn / Engage for X" switch; `/#extension` and `/#x-extension` open the right panel; without JavaScript both panels show.
- Tools: Thumbnail and Content Hub as two panels; example calendar replaces "coming soon".
- Pricing (`Pricing.tsx` + `components/pricing/StudioPlanCard.tsx`, `EngagePlanCard.tsx`): credits explained beside the heading, aligned plans, extension plans, expandable FAQ. Values from lib/plans.ts. Old PlanCard/ExtensionPlanCard stay for Settings → Billing until Phase 4.
- Referral band, final CTA, two-column contact, grouped footer.
- Link-preview image `app/(marketing)/opengraph-image.tsx` (current logo + headline); `/opengraph-image` made public in proxy.ts for crawlers.
- Removed (content moved): HowItWorks, TypewriterPrompt, ExtensionFeature, XExtensionFeature.
- Fixes found while building: `buttonVariants()` now merges classes (link-buttons lost borders/colors); ContactForm restyled with screen-reader labels (shared with /contact).

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Existing browser tests (tests/e2e/public.spec.ts, desktop + mobile + tablet) | 9 of 9 pass (exact H1, #how-it-works, two logos, no overflow) |
| Landing checks (22) | all pass: compact header, Engage switch + deep links + checkout links, demo keyboard, FAQ, contact success/error (request intercepted, nothing sent), og:image public, mobile menu + Escape, no-JS render (real JS-disabled browser) |
| Overflow / console | none at 360, 390, 768, 1440, 1920 on /, /contact, /privacy, /tools/tap-hold-maker |
| Production build | pass (`next build`) |
| Preview routes in production | 404 |
| Phone lab perf (production build, 390px, ~4G + 4× CPU) | Before: LCP median 2.78s (3 runs), CLS 0, JS 436KB. After: LCP median 2.07s (5 runs, 1.85–2.95s), CLS 0, JS 459KB, fonts 140KB (Onest still loads for Phase 2 pages). Lab only — not field data; INP not measured |

**Needs the owner**

1. Review the page (http://localhost:3000 while signed out).
2. Rows 4 ("12 post ideas" — wrong) and 12 ("1,000+ creators" — unverified) in copy-ledger.md.
3. Approve or rename the new structural labels (copy-ledger.md, Phase 1).
4. Real screenshots / testimonials / numbers, if you want the evidence and testimonial sections.

## Phase 2 — other public pages, auth, onboarding (2026-10-11)

Same rule as Phase 1: layout only, logo and copy unchanged. The three open copy questions (rows 4, 12 and the new labels) were not answered, so they stay as they were.

**Built**

- Marketing layout now uses the new fonts everywhere (Onest removed from public pages); shared header and footer from Phase 1.
- Legal pages (`LegalShell` + class-only edits in privacy/terms/refund): reading column, no motion. Text proven identical.
- Contact: editorial two columns (details as a list, form in a panel).
- Verify certificate: kit input and button with loading state, labeled field, announced results (found / not found / error).
- Tap & Hold maker: same logic (262 lines untouched); markup moved to tokens, its own dark toggle now flips `data-theme`.
- Start Page (`StartPageView`): three themes kept (default now on tokens; dark keeps its amber; minimal stays minimal), larger tap targets.
- Sign in / Sign up: stickers removed; logo, Clerk card on token colors (`lib/clerkAppearance.ts`); on wide screens a static, labeled product example beside the form.
- Extension connect: light card with icon per state, announced status; token hand-off logic untouched.
- Onboarding: no stickers; logo + segmented progress ("Step n of 6", exposed as a progressbar); kit buttons in `StepNav` (Continue stays clickable when incomplete so it can explain why; the shake now actually animates). Identity = single-choice group (arrow keys); Industry = accessible combobox; Topics = labeled chips with remove buttons; Audience = labeled fields + pressed-state seniority toggles; Goals = real checkboxes with a separate "Set primary" button; Voice = checkboxes with the 2-tone limit; Completing = same timing, announced status, spinner stops with reduced motion.
- Shared: `WordLimitedField` accepts id/invalid and its warning is readable and announced; option cards gained a row layout and an extra-content slot.
- Removed: `components/auth/AuthStickers.tsx` (no other users). Onboarding no longer uses `Stickers` (the app still does until Phase 3).
- Dev-only previews (404 in production): `/design-preview/onboarding/[step]` (real step components in the real layout), `/design-preview/start-page` (example data), `/design-preview/extension-connect` (refuses to run while signed in, so it can't mint a real token).

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Full `npm run build` (with prisma generate) | pass |
| Existing browser tests (incl. Tap & Hold edit + PNG/WebP export) | 9 of 9 pass on desktop, mobile, tablet |
| Phase 2 interaction checks (23) | all pass: identity validation + arrow keys, industry combobox, topics add/remove, seniority toggle, goals primary, voice 2-limit + save error, completing status, certificate found/not-found/error, extension connect success/error, sign-in renders |
| Landing checks (22) re-run after the layout change | all pass |
| Copy | rendered text identical (legal, contact, verify, tap & hold — case/sr-label only); all onboarding/auth strings present |
| Screens | 17 screens × 390/768/1440: no overflow, no console errors (except the expected signed-out 401 in the extension-connect preview) |
| Production | preview routes 404; public pages 200; /onboarding still redirects signed-out visitors to sign-in |

**Not verified:** the real /onboarding and /extension-connect pages while signed in (no test account); Clerk's emailed-code and Google steps beyond the first screen.

**Incident:** after the session restart, typecheck and build failed on a corrupted generated file (`.next/dev/types/routes.d.ts`, cut off when the dev server was killed mid-write). Deleted the generated folder and restarted; not a code issue.

## Phase 3a — app frame and the first four signed-in pages (2026-10-11)

Phase 3 is split in two so each part is reviewable: **3a** (this) is the frame every signed-in page uses plus Generate, Work on Own Idea, History and Pinned; **3b** is the idea page and the caption / image / carousel screens (credits, image generation, LinkedIn posting). Copy unchanged — see copy-ledger.md, Phase 3a.

**Built**

- App frame (`components/shell/AppChrome.tsx`, `AppFrame.tsx`, `nav.ts`, `GoToPalette.tsx`; `app/(app)/layout.tsx` keeps every check it had — sign-in, onboarding redirect, intern subdomain, upgrade and profile-review banners):
  - Desktop, two rows: logo · **Create / Content / Engage** (+ Intern Points for interns) · Admin (admins) · credits · New session (on Generate) · **New post** menu · **Go to…** (Ctrl/⌘ K) · account menu. Second row: the group's pages as tabs (Create: Generate, Work on Own Idea, Toolkit; Content: Content Hub, Ideas Board, History, Pinned). Engage and Settings keep their own tabs inside the page until Phase 4; the idea page and creation screens get their own toolbar in 3b.
  - Phones: top bar keeps credits, New session and Go to…; **bottom tab bar** Create · Content · Engage · You, each opening a sheet of its pages (You = profile, billing, settings pages, Admin, Log out). Log out was not reachable on phones before.
  - employee.carouselabs.com: only Intern Points (plus the account menu / You sheet with its old items), no credits, Go to… or New post — same restriction as before.
  - Whole signed-in app now uses the design-system font (Geist) and tokens; stickers removed. `main` stays the scroll container with the same padding, so pages not migrated yet keep their layout.
  - Banners restyled on tokens (upgrade, profile review, maintenance — the maintenance one is shared with public pages). Plan badge on tokens.
- Generate (`app/(app)/dashboard/page.tsx`, `components/dashboard/*`): before the first batch, the welcome message with the brief directly below it ("the bar below" stays true) and Work on Own Idea. After: brief at the top, then a numbered idea list with pin and dismiss always visible; on desktop the chosen idea sits in a sticky column with the session-lock warning and "Let's go →" (keyboard selection moves focus there); phones and tablets confirm in the same dialog as before. Load more, the 30-idea cap, New session, errors and the referral nudge behave as before.
- Work on Own Idea: two numbered steps, labeled fields, word counts announced, errors as alerts; same limits and request.
- History: header with search, filter chips (pressed state), one list for all three kinds of entry. Thumbnail rows no longer nest buttons inside the link. Caption preview always shown on one line (it used to appear on hover and shift the rows under the pointer — found by the browser checks).
- Pinned: same header pattern, rows instead of a card grid.
- Removed (no other users): `Sidebar`, `Topbar`, `NavItem`, `UserMenu`, `AppStickers`, `components/shared/Stickers.tsx`.
- Fixes found while building: Go to… kept the previous search after Escape (next search started polluted); category colors shared in `components/shared/categoryTone.ts`.
- Dev-only preview `/design-preview/app/[dashboard|own-idea|history|pinned]` (`?banners=1`, `?employee=1`): the real pages in the real frame. It refuses to run while signed in, because the pages would then generate, pin and delete for real.

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Full `npm run build` | pass |
| Existing browser tests (desktop, mobile, tablet) | 9 of 9 pass |
| Phase 3a checks (79, every API answered with example data) | all pass: nav groups + current states, sub-tabs, credits wordings (paid and free-at-zero), Admin only for admins, New post menu, account menu, Go to… (Ctrl K, filter, Escape, Enter navigates), skip link, banners + dismiss, intern-subdomain frame, phone tab bar + three sheets; Generate intro copy, suggestion chip, topic sent, 10 numbered ideas, detail column, pin/dismiss requests, keyboard focus to detail, load more to the 30 cap, New session reset, phone confirmation (Cancel, Let's go → /idea/…), error alert; Own Idea labels, word count, step 2 focus, building status, error; History kinds, badges, filter, search, empty states, pin/delete requests, thumbnail link; Pinned search, Remove, empty state; no overflow or page errors on 4 pages × 360/390/768/1024/1440/1920 |
| Copy | every string from the 21 old files present |
| Production | `/design-preview/app/*` 404; /dashboard, /history, /pinned, /own-idea still redirect signed-out visitors to sign-in; public pages 200 |

Screenshots (git-ignored): `audit-artifacts/redesign/phase-3a/`.

**Not verified:** the real signed-in pages with a real account (no test account — the preview uses the same page components and frame, with example data); the intern subdomain on a real host; pages not migrated yet now render in the new font and frame (Content Hub, Toolkit, Extension, Settings, Intern, idea and creation screens) — not checked visually because they need sign-in.

## Phase 3b — idea page and the three creation flows (2026-10-11)

Approved layout A applied to creation: a toolbar with the step trail, card pickers for the setup steps, and a workspace (canvas + side panel + action bar) for the result. Presentation only — every flow keeps its state, requests, credit charging, saving, limits and copy (see copy-ledger.md, Phase 3b).

**Built**

- Shared pieces: `components/create/CreateKit.tsx` (toolbar + step trail, choice card, category chips, ratio card, workspace, action bar, error notice, loading state, tags) and `components/create/CaptionSetup.tsx` (the platform → caption structure → own structure / template screens the three flows share).
- Idea page (`components/idea/IdeaView.tsx`, used by `app/(app)/idea/[id]/page.tsx`): editorial header, the breakdown as a reading column, "Choose Output Type" as a sticky panel beside it (below on phones). Lock dialog, Pro gate and history tracking unchanged.
- Caption flow: setup steps as card pickers; result = caption canvas with a char count and a bar for Copy / Save Draft / Schedule for Later / Post to LinkedIn; side panel = Tone, "What should change?" + Regenerate, voice guidelines, alternative hooks, previous versions. The panel folds away on wide screens ("Settings").
- Image flow: the same setup cards; caption, format (ratio cards), reference and visual-structure steps in one column with Back / Skip / Continue under each; result = image canvas (with its instructions + Regenerate Image under it), caption and the waiting game in the side panel, finishing actions in the bar.
- Carousel flow: same pattern; slides grid on the canvas (3 columns on wide screens), failed slides with Retry, both confirmation dialogs unchanged in wording.
- On phones the finishing actions follow the content as full-width buttons (Post first) instead of floating over the text being edited.
- Shared generate components restyled on tokens: caption editor, tone, voice toggle, hooks, versions, regeneration toast, draft recovery, Post to LinkedIn, Schedule for Later, instruction box, reference uploader, image preview, slide grid, waiting game. The Thumbnail tool (Phase 4) shares the uploader and game, so it picks these up.
- Loading screens for /idea and /generate/* on tokens.
- Fixes found while building: the regeneration-limit toast was dark text on a dark background (unreadable); slide-number badges were dark on a dark overlay and the BODY badge pale on pale; the reference drop zone couldn't be reached by keyboard (now a button); carousel "Saving?" typo.
- Unit test `tests/caption-editor.test.tsx` updated: Regenerate left the editor, so the test now checks the editor reports its save (the page disables Regenerate meanwhile — also checked in the browser).
- Dev-only preview `/design-preview/create/[idea|caption|image|carousel]` (`?plan=FREE`, `?guidelines=1`): the real components in the real frame with example props. Refuses to run while signed in (it would spend credits and save posts).

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Full `npm run build` | pass |
| Existing browser tests (desktop, mobile, tablet) | 9 of 9 pass |
| Phase 3b checks (85, every API answered with example data) | all pass: idea page (heading, sections, panel beside/below, three formats + credits, lock dialog + Cancel, lock → caption flow + history, locked session, Free plan carousel → billing); caption flow (toolbar, step trail, platform/structure/custom/template steps + backs, request carries platform/template/voice flag, streamed caption, save after generation, hooks replace the first line, Save Draft, Copy, Regenerate with instruction, Regenerate disabled during a save, versions, tone regenerates, limit toast + disabled at the limit, LinkedIn not connected, Settings folds the panel, over-limit warning, restored session, phone layout); image flow (every step, ratio pressed state, reference option disabled without a reference / enabled with one, 3-stage requests in order, stage status, game, image actions, Save Draft, reference change invalidates the image); carousel flow (every step, confirm dialog, failed slide + Retry, save after the last slide, per-slide regenerate is a paid regen, LinkedIn warning: Go Back posts nothing, Upload as Images posts); no overflow or page errors at 360–1920 |
| Phase 3a checks re-run | 79 of 79 pass |
| Copy | every string from the 25 old files present (one deliberate fix, above) |
| Production | `/design-preview/create/*` 404; /idea and /generate/* still redirect signed-out visitors to sign-in |

Screenshots (git-ignored): `audit-artifacts/redesign/phase-3b/`.

**Not verified:** real generation, image models, LinkedIn posting and saving against the real APIs (the checks answer every request with example data; no test account); PDF export (unchanged code); the Thumbnail tool's look with the restyled uploader and game (needs sign-in; Phase 4).

## Phase 4a — Engage (LinkedIn + X) and Settings (2026-10-12)

Phase 4 is split in two: **4a** (this) the Engage extension pages and Settings; **4b** Content Hub + Ideas Board, Toolkit, Thumbnail and Intern Points. Copy unchanged — see copy-ledger.md, Phase 4a.

**Built**

- Header second row (approved layout A): Engage shows the current extension's tabs (LinkedIn's or X's), Settings shows its six tabs (`components/shell/nav.ts` `subNavItems`). The tab strips inside the pages are gone; each page keeps its title — the extension name, which still switches extensions (`components/extension/ExtensionHeader.tsx`, was ExtensionTabs), or "Settings" (`components/settings/SettingsHeader.tsx`, was SettingsTabs).
- Every Engage and Settings component moved from hand-picked colours and pixel sizes to the design tokens (mechanical class mapping: 1,381 class names; text, logic and inline styles untouched).
- Extension overview (`ExtensionOverview` now loads data, `ExtensionOverviewView` shows it): plan, install steps and this month on the left; the other extension and signed-in browsers beside them on wide screens.
- Plan & payments for both extensions share `components/extension/ExtensionBillingView.tsx`; Settings → Billing's display moved to `components/settings/BillingView.tsx` (the page only loads data).
- Settings → Billing and both extension plan sections now use the plan cards from the landing page (`StudioPlanCard`, `EngagePlanCard`) — the old `components/marketing/PlanCard.tsx` and `ExtensionPlanCard.tsx` are removed. The page anchors `#extension-plan` / `#x-extension-plan` are kept.
- Settings → Profile: the save row is now a floating bar (it used to float as a bare button over the form); topic chips have labelled remove buttons.
- Fixes found while building: the "Saved" toast was dark text on a dark background (unreadable) — now readable and announced; checkout buttons lost their coloured glow.
- Dev-only preview `/design-preview/workspace/[engage|engage-x|settings]/…` (`?access=unlimited`, `?plan=PRO|GROWTH`): every 4a page in the real frame. Server-loaded pages render their display component with example props; the rest load example data in the browser checks. Refuses to run while signed in.

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Phase 4a checks (50, every API answered with example data) | all pass: header tabs for Engage (LinkedIn and X labels) and Settings with the current tab, no tab strip left in pages, extension title + switcher (both extensions, note, Escape), overview links and counts, X history asks for X entries, history filter + Copy, profile and agent editors open/close, engage settings save, plan cards with checkout / manage links (new tab), plan anchors kept, payments + links, Settings profile Save (disabled until a change, PATCH, "Profile saved" toast), voice guidelines save, referral Copy + payout save, start page save, account toggle save, billing plans and both extension cards, phone tab bar states; no overflow or page errors on 16 pages × 360/768/1024/1920 |
| Phase 3a checks re-run | 79 of 79 pass |
| Full `npm run build` | pass |
| Existing browser tests | 9 of 9 pass |
| Production | `/design-preview/workspace/*` 404; /extension/* and /settings/* still redirect signed-out visitors to sign-in |
| Copy | every string from the old files (incl. the four replaced components) present |
| Screens | 16 pages at 390 and 1440 (plus editor, switcher and X states): no overflow, no page errors |

Screenshots (git-ignored): `audit-artifacts/redesign/phase-4a/`.

**Not verified:** the real pages with a real account (no test account): live plan states from Lemon Squeezy, real device sign-outs, real LinkedIn connect/disconnect, the data export download.

### Phase 4a, second pass — restructure (2026-10-12)

The owner asked for real structure, not just the new look, on the pages that had kept their old layout. Copy and behaviour unchanged.

- **Custom tones / X reply profiles** (`ProfilesManager` `KindPanel`): voices listed on the left; the selected one shown on the right as a specimen — its name in the display serif, who it speaks as, its settings as a spec block, Always / Never do, and its samples as comment bubbles — with Edit, Make default, Duplicate / Customise and Delete under it. Editing and creating open in that panel. The kinds are a segmented control. Phones: list, then the panel (picking a voice scrolls to it).
- **AI agents** (`AgentsManager`): agents on the left; the selected one as a briefing — section titles in a margin column (Your business, Goals, Style, Knowledge, Rules, Examples), verified facts and situations as lists, example replies as reply bubbles. The builder opens in the panel.
- **History** (`HistoryList`): a feed grouped by day on the left (status dot, who it was for, time, first line); the selected item on the right as the exchange — the post quoted, then what was written as the reply, with Copy, View post / Open chat and Delete.
- **Settings** (`components/settings/SettingsSection.tsx`): Profile, Voice Presets, Referrals, Start Page and Account are now sheets — each section's title and explanation in a left column that stays in view, controls on the right. Billing keeps its full-width plan comparison.
- Small labels no longer forced to capitals.

Verified: typecheck, lint (0 errors), the 50 Phase 4a checks again, 36 new structure checks (switching items, editors in the panel, Make default / Save / Delete requests, delete confirmations, day groups, X profiles, phone scroll-to-detail, settings sections, no forced capitals), copy check, full build.

## Phase 4b — Content Hub, Ideas Board, Toolkit, Thumbnail, Intern Points (2026-10-12)

Built with real structure from the start (the 4a second-pass approach). Copy and behaviour unchanged — see copy-ledger.md, Phase 4b. Every class in these pages moved to the design tokens.

**Built**

- **Content Hub** (`app/(app)/content-hub/_client.tsx`, state and requests untouched):
  - The List view is an agenda: This Week / Next Week / Later / Past, and inside each, posts gathered under their day — the date in a left margin in the display serif (today in violet), the post beside it (thumbnail, status, platform, time, caption, tags, failure / pending notes). Clicking an editable post opens it.
  - Month and Week views: serif day numerals, today underlined, the month name as a serif title with Previous / Today / Next. On phones the month shows a dot per post (the day opens its list) and the week stacks into rows.
  - One side panel for everything (new post, reschedule, a day, recurring slots, queue settings, library, bulk upload): docked beside the calendar on wide screens (≥1280px) so the calendar stays usable, a full-height sheet on smaller ones. It takes focus when it opens and Escape closes it. The post or day open in it is highlighted in the list / calendar.
  - New post flow: a three-segment progress bar under the panel title, the two content sources as choice cards, the chosen post shown on the platform step, date / time / suggested times / tags / preview, and the actions (Schedule, Add to Queue, Save as Draft / Remove) in a fixed footer.
  - The hub's tools (Ideas Board, Recurring Slots, Queue Settings, Library, Bulk Upload) are a labelled toolbar (icons only below 1280px); the tag filter is a row of chips.
  - Panels restyled: custom post composer (Load Template / Hashtags are proper menus; platforms are checkboxes), image uploader and CSV drop zone are real buttons, queue / recurring forms, library tabs (tag colours are a radio group), platform preview.
- **Ideas Board**: a list of saved ideas (thumbnail or type icon, title or first line, type and when) beside the selected idea in full — a note in the display serif, a link with its address, an image large — with Turn into Post and Delete. The capture form opens above with Note / Link / Image as a segmented control. Phones: list, then the idea (picking scrolls to it).
- **Toolkit**: a catalogue instead of a card grid — each tool on its own line, its name in the display serif, its kind beside it, the description, and its buttons on the right. Display moved to `components/toolkit/ToolkitView.tsx` (the page only loads plan access).
- **Thumbnail**: the creation-flow toolbar (back to Toolkit, step trail Reference → Questions → Blueprint → Thumbnail) replaces the header's sub-tabs. The reference is a wide 16:9 canvas (`ReferenceUploader size="canvas"`) beside "Tell us about your video". The questions are a chat with the answer box floating at the bottom and the reference kept in view on the right. The blueprint is two spec sheets (label / value) beside the reference, with Generate in an action bar. The result is shown large with Download / Start Over.
- **Intern Points**: profile and internship timeline in one band; the score as one large serif number with This Week / Today / Attendance Rate / Leave Balance as a quiet ledger beside it; the month calendar and recent entries below; leaderboard, leave and support in a side column. Display moved to `components/intern/InternPortalView.tsx` (the page loads and computes). The status badge is no longer forced to capitals; the period switch, support toggle and progress bar now say their state to screen readers.
- **Found and fixed in the app frame (affects every signed-in page):** the scroll area's inner wrapper had a fixed height, so on long pages the bottom padding was never added — on phones the last thing on a long page sat behind the tab bar. The wrapper is now `min-h-full`, and the scroll area has bottom scroll padding so focused fields stop above the tab bar.
- Dev-only preview extended: `/design-preview/workspace/content-hub[/ideas]`, `/toolkit` (`?access=unlimited`), `/thumbnail`, `/intern` (`?ended=1`).

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Phase 4b checks (89, every API answered with example data) | all pass: agenda groups and day marks, tag filter, side panel docked beside the calendar on wide screens / full sheet on phones, focus + Escape, pick → platform → date flow with Schedule / Save as Draft / Add to Queue requests, custom post (validation, Load Template, custom-post then scheduled), reschedule (row marked, PATCH), Remove, Duplicate, month day → day panel → Add here, next month, recurring fill, week, drafts → Schedule Draft, queue slot add / pause, recurring slot validation + add, library tabs and colour radio, bulk upload; Ideas list → detail, Turn into Post link, Delete, save with validation, phone scroll-to-detail; Toolkit links, new-tab installs, unlimited state; Thumbnail toolbar + step trail, Analyze gating, reference canvas, file mode, chat choice / photo / own words, blueprint sheets, generate → result, Start Over; Intern score, status case, progress bar, leaderboard period refetch, leave request, support open + send, ended state; no overflow at 390 |
| Earlier checks re-run (shared frame changed) | Phase 3a 79 of 79, Phase 4a 50 of 50, 4a structure 36 of 36 |
| Full `npm run build` | pass |
| Existing browser tests | 9 of 9 pass |
| Production | `/design-preview/workspace/*` 404; /content-hub, /content-hub/ideas, /toolkit, /thumbnail, /intern redirect signed-out visitors to sign-in |
| Copy | every string from the old files present (the only "misses" are code fragments) |
| Screens | 22 states at 390 and 1440: no overflow, no page errors |

Screenshots (git-ignored): `audit-artifacts/redesign/phase-4b/`.

**Not verified:** with a real account — real scheduling and publishing to LinkedIn, CSV import against the real API, image uploads to storage, the thumbnail AI calls (they spend credits), and a real intern record.

### Phase 4b follow-up — real tool logos (2026-10-12)

The owner asked for real logos instead of generic icons on the tools. The Toolkit now shows each Engage extension's own toolbar icon (`public/images/extensions/`, already used on the Engage pages). The two web tools had no logo anywhere in the project, so each got an app icon in the same style (rounded square, solid colour, white mark): `public/images/tools/tap-hold-maker.svg` (a held press) and `public/images/tools/thumbnail-recreation.svg` (a thumbnail with subject and headline). They also appear beside the titles on the Tap & Hold Maker and Thumbnail pages. Replace the two SVGs if official artwork exists. Checks: Toolkit 6/6, Thumbnail 13/13, typecheck, lint.

## Phase 5a — admin console (2026-10-12)

The owner chose a **dark console** for the admin (it was dark before, with its own font). It keeps its sidebar (layout directions) and now runs on the design system's dark theme. Copy and behaviour unchanged — see copy-ledger.md, Phase 5a. Phase 5 is split: 5a (this) the shell, the shared admin kit and twelve pages; 5b the Engage admin, Interns, Broadcasts, Sequences and Scheduled Emails.

**Built**

- **Theme and type:** `app/(admin)/layout.tsx` renders `data-theme="dark"` with the app's fonts (Geist + Instrument Serif) instead of Onest and hard-coded blacks. While the admin is open, `AdminShell` also marks `<html>` dark, so dialogs, menus and toasts (rendered outside the layout) match.
- **Every admin file on tokens:** a context-aware class mapping (scratchpad `admin_tokenize.py`) moved all 56 admin files from ~50 hand-picked dark colours and pixel sizes to the dark tokens: white text on a solid violet fill became the brand's own text colour, white text over photo overlays stayed white, print styles untouched, forced capitals removed. Light-on-pastel spots it couldn't know about were fixed by hand (solid red badges, the settings switch knob).
- **Shared kit (`components/admin/ui.tsx`):** same exports, now built on the design system — AdminButton → Button, Modal → Dialog (focus trap, Escape, labelled), ConfirmModal → ConfirmDialog (alertdialog, focus on Cancel), inputs on the control styles, StatCard/AdminCard/PlanBadge/Spinner on tokens. Table classes moved to `components/admin/tableStyles.ts` (a plain module server pages can read) and the table wrapper now contains its own positioned content.
- **Shell (`AdminShell`):** the real CarouseLabs mark in the sidebar, groups without forced capitals, the current page with a violet edge, the page title as the one main heading (in-page h1s on Engage pages became h2). Phones: the sidebar is a drawer (menu button, backdrop, Escape; out of the tab order when closed) — before, it took 220px of a phone screen permanently.
- **Dashboard** (`AdminDashboardView`): total users as one large serif number with the plan mix as a single bar (Pro / Growth / Free — colours checked for the dark surface: lightness, chroma, colour-blind separation, contrast) and a legend that doubles as the table view; posts, carousels, images, credits and API cost as a quiet ledger; quick actions; recent signups and posts.
- **Users:** plan filter as chips, sortable headers that announce their order, the row "..." menu is a real menu (keyboard, Escape, focus), bulk actions float at the bottom while users are selected.
- **User Profile** (`UserProfileView`): name in the display serif with plan and suspension, the four figures as a ledger, posts as the main canvas, admin actions in a side panel beside them (labels now tied to their fields).
- **Subscriptions** (`SubscriptionsView`): the five counts as a ledger beside the export, then the table.
- **Referrals:** the referrer opens in a panel docked beside the list (below it on narrower screens) instead of a pop-up; rows are reachable by keyboard.
- **Settings and Pre-fill Profile:** the same two-column sheet as the app's Settings pages.
- **Analytics charts:** chart chrome on the dark theme; donut labels in text colour (not the slice colour); Thumbnail gets its own validated colour (rose) instead of reusing violet and showing "THUMBNAIL"; any other format folds into a neutral "Other".
- Dev-only preview `/design-preview/admin[/...]`: twelve admin pages in the real frame; the three server-loaded pages render their display component with example props. Refuses to run while signed in; 404 in production.

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint | pass / 0 errors |
| Phase 5a checks (70, every /api/admin request answered with example data) | all pass: dark root for portals, current page, one h1, group fold/open, collapse, Ctrl K search, phone drawer open + Escape + hidden from tab order; dashboard headline, plan mix + shares, ledger, Grant Credits dialog (dark) then lookup + POST + toast; users chips, search, sort announced, row menu then Set to Growth (asks) then POST, Grant then POST, bulk bar with bulk grant / bulk suspend (asks), CSV download; profile figures, panel, Grant 25, Change Plan disabled until changed then asks then POST, Save Note then PATCH; subscriptions ledger + rows; posts search refetch; credits alerts + reset-all (asks); referrals docked detail + Record Payout + Close; tasks add + deactivate; analytics charts + Thumbnail slice + Cohorts; audit rows; settings sheet + maintenance switch then PUT; prefill email required; 12 pages at 390 without overflow or errors |
| Copy | every string from the old admin files present (misses are code fragments and class names) |
| Screens | 17 states at 390 and 1440 (`audit-artifacts/redesign/phase-5/`) |

**Not verified:** the real admin with real data (needs the admin account). The 5b pages carry the new dark tokens from the class mapping but haven't been restructured or seen with data yet.

## Phase 5b — Engage admin, Interns, emails (2026-10-12)

The second half of the admin, on the dark console from 5a. Copy and behaviour unchanged — see copy-ledger.md, Phase 5b. Every page in the inventory is now redesigned.

**Built**

- **Figure rows instead of tile grids:** a shared `components/admin/Ledger.tsx` (label, value, hint; a figure that leads somewhere is a whole-figure link). Engage Overview, Engage AI, Engage Errors and the intern profile use it in place of their grids of identical boxes.
- **Engage Overview:** the users count as the headline (links to Engage users) with the people figures beside it in one band, then "Generated in range" as a figure row, then the charts.
- **Engage user:** the same profile band as the website User Profile — name in the display serif, the access summary as a figure row inside it — then the tabs.
- **Free access:** the hand-built revoke pop-up is now the shared dialog (focus trap, Escape, labelled).
- **Engage feature colours:** Messages moved from magenta to the rose already validated with violet / teal / amber — magenta and teal were too close for deuteranopia on the new surface.
- **Intern profile:** underline tabs (the Engage pattern, real tabs for screen readers) instead of a pill bar; the overview is one band — name in the display serif, timeline, and Total Points / Attendance Rate / Leave Used / Leaderboard Rank as a figure row.
- **Selected states:** segmented controls that showed the chosen option as a solid violet button (intern filters, send mode, recipients, log view, task scope, analytics tabs) now use the raised style used everywhere else, and say they're pressed.
- **Broadcasts:** composer on the left, sent broadcasts beside it on wide screens.
- **Sequence editor:** the steps are the main canvas; the sequence settings and Save / Delete sit beside them; engagement runs underneath.
- **Tables:** every admin table wrapper now contains its own positioned content (fixed the Engage audit log overflowing on phones).
- Dev-only preview extended to all 19 pages (`/design-preview/admin/engage…`, `/interns…`, `/broadcasts`, `/sequences…`, `/scheduled-emails`). The Engage example data is built from the app's own access rules, default settings and prompt samples, so its shapes are exact.

**Verified**

| Check | Result |
| --- | --- |
| Typecheck / lint / unit tests | pass / 0 errors (same 16 old warnings) / 272 of 272 |
| Phase 5b checks (63, every /api/admin request answered with example data) | all pass: Engage overview headline + linked figures + range / extension refetch; Engage users rows + links; Engage user band + tabs + pause (asks why, then POST); Free access revoke dialog + PATCH with reason; Controls pause (asks, then PATCH); AI figure row + models + prompts; Errors figure row; Health checks; Sessions; Audit; interns roster filter (pressed) + period refetch; intern profile tabs + band + support + notes; checklist; announcement composer; broadcasts two columns + send mode; sequences list; sequence editor columns + Save; new sequence waits for a name; scheduled emails cancel (asks); 19 pages at 390 without overflow or errors |
| Phase 5a checks re-run | 70 of 70 |
| Copy | every string from the old admin files present (misses are code fragments and class names) |
| Full `npm run build` / existing browser tests | pass / 9 of 9 |
| Production | `/design-preview/admin/*` 404; admin pages redirect signed-out visitors to sign-in |

Screenshots (git-ignored): `audit-artifacts/redesign/phase-5b/`.

**Not verified:** the real admin with real data (needs the admin account).

