# Copy ledger

Every proposed wording change, with where the current line lives. **Nothing in this table is applied to live pages yet.** Live pages change only after the owner approves a row (Phase 1 onwards). Proposed lines appear in `/design-preview` sample screens, marked "Proposal · pending approval". Legal text is excluded.

Status: `pending` = waiting for approval · `required` = factual correction the brief requires (still logged, applied in Phase 1) · `no change` = checked, keep as is.

| # | Current line | File | Proposed | Reason | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | "Create viral content for every platform" | `components/landing/Hero.tsx:119` | "Your ideas. Your voice. Ready to publish." | A specific promise without claiming virality | pending |
| 2 | "AI-powered content creation" (hero pill) | `components/landing/Hero.tsx:113` | "Content studio + writing extensions" | Names what is sold | pending |
| 3 | "Tell CarouseLabs about your business and it generates post ideas, writes your captions, and creates the images and carousels — ready for LinkedIn, Instagram, and Twitter/X in minutes." | `components/landing/Hero.tsx:125` | "Create posts, images, and carousels with CarouseLabs. Write LinkedIn and X replies with Engage. Keep both in your own voice." | Separates the two products and their jobs; drops the unmeasured "in minutes" | pending |
| 4 | "Get 12 post ideas every session…" | `components/landing/FeaturesGrid.tsx:9` | "Get 10 post ideas per session…" | The product generates 10 (hero badge also says 10) | required |
| 5 | "Everything you need to own social media" | `components/landing/FeaturesGrid.tsx:52` | Section replaced by the four-step product tour; heading "From a first idea to your next post." | More concrete; avoids overclaiming | pending |
| 6 | "Recreate Any YouTube Thumbnail — With Your Own Face, Your Own Content" | `components/landing/ThumbnailFeature.tsx:31` | "Make your next thumbnail feel like you." | Shorter; capabilities stay in the supporting copy | pending |
| 7 | "Plan Your Entire Content Calendar — Not Just One Post" | `components/landing/ContentHubFeature.tsx:34` | "Give every post a place." | Shorter; supporting copy keeps the verified calendar functions | pending |
| 8 | "Comments, Replies and Conversations on LinkedIn — Written in Your Voice" | `components/landing/ExtensionFeature.tsx:87` | "Keep the conversation in your voice." | Short headline; full product name and features stay | pending |
| 9 | "Replies and Messages on X — Written in Your Voice" | `components/landing/XExtensionFeature.tsx:82` | "Write replies that sound like you." | Clearer; full product name and DM capability stay | pending |
| 10 | "Simple, honest pricing" | `components/landing/Pricing.tsx:82` | "Choose how you create and connect." | Introduces the Studio / Engage split; all prices stay visible | pending |
| 11 | "Earn 8% Recurring Commission for Every Referral" | `components/landing/ReferralFeature.tsx:30` | "Earn 8% recurring commission." | Sentence case; eligibility and the 50-credit rule stay in the body | pending |
| 12 | "Join 1,000+ creators turning ideas into scroll-stopping posts — starting today." | `components/landing/CTA.tsx:17` | Remove unless verified; optional replacement "Bring your next idea to life." | Unverified number can't stay as fact. Removal is logged; replacement needs approval | pending (owner: is 1,000+ verified?) |
| 13 | "Nothing is ever posted or sent for you" | `components/landing/ExtensionFeature.tsx:35`, `components/landing/XExtensionFeature.tsx:37`, `lib/plans.ts:114`, `lib/plans.ts:155` | Keep | The brief worried this conflicts with studio scheduling. Checked: it appears **only** in extension contexts, where it is accurate | no change |
| 14 | "🎁 Win the most unique prize in the world — stop on the EXACT same number!" and "🎉 You won the most unique prize in the world!" | `components/generate/LoadingGame.tsx:96`, `:136` | "Your visuals are being created. You can play while you wait." (the game stays available) | Honest wait-state text next to a paid product | pending |
| 15 | "✨ Create a Tap & Hold Image — Free, No Login" (third hero button) | `components/landing/Hero.tsx:155` | Move to Resources and the tools section as "Tap & Hold maker · Free" | Two hero actions, not three | pending |
| 16 | "⭐ Most Popular" | `components/marketing/PlanCard.tsx:29` | "Most Popular" (text badge) | Consistent badge, no emoji | pending (stylistic) |
| 17 | "No credit card required" | `components/landing/CTA.tsx:26` | Keep | Free sign-up asks for no card; consistent with the Free plan | no change (confirm) |

## How rows get applied

1. Owner marks rows approved (reply with row numbers).
2. The phase that owns the file applies them; required rows (4) are applied in Phase 1 regardless.
3. New headings, labels, empty states and errors written during a phase are added here before they ship.

## Phase 1 (landing page) — what happened to the copy

The owner approved the **layout only** and asked to keep the logo and all unapproved copy unchanged. So every line in rows 1–17 still reads exactly as before on the live landing page; only where it sits changed.

| Row | Status after Phase 1 |
| --- | --- |
| 1, 2, 3, 5–11, 14, 16 | Unchanged, still pending approval |
| 4 — "12 post ideas every session" | **Applied 2026-10-11:** now "Get 10 post ideas every session…" (owner: yes) |
| 12 — "Join 1,000+ creators" | **Removed 2026-10-11** — owner confirmed it isn't a real number; no replacement line |
| 13, 17 | No change needed |
| 15 — Tap & Hold hero button | Moved out of the hero (approved layout). It now lives in the header's Resources menu and the footer under its existing label "Tap & Hold Maker (Free)" |

Other moves, no wording changed: How it works and "Export & Publish" became the steps of the interactive product demo (Hero); the remaining five features became an editorial list; the two extension sections became one section behind a switch; Thumbnail and Content Hub became two panels; the pricing FAQ became expandable items.

### New labels the approved layout needed

Short structural labels only. **Approved by the owner 2026-10-11** ("if you want you can").

| Label | Where |
| --- | --- |
| "Product", "Engage", "Resources" | Header menus (items inside use existing names) |
| "Engage for LinkedIn" / "Engage for X" | The switch in the Engage section (shortened product names) |
| "Choose an extension" | Screen-reader name of that switch |
| "Product", "Resources", "Legal" | Footer group headings |
| "Example", "Example week" | Labels on demo visuals that use example content |
| "Your name", "Your email", "Subject", "How can we help?" | Screen-reader labels on the contact form (same words as the visible placeholders) |
| "Not included:" | Screen-reader prefix on plan features marked ✗ |
| "Menu", "Open menu" | Mobile menu |

The product demo shows illustrative example content (the "day two" onboarding post, sample ideas and slides), clearly labeled "Example".

## Phase 2 (other public pages, auth, onboarding) — copy

No visible line was reworded. Verified two ways: rendered text of /privacy, /terms, /refund, /contact, /verify-certificate and /tools/tap-hold-maker compared before/after (identical apart from small labels that used to be uppercased by CSS, and the screen-reader label below), and every string in the 16 onboarding/auth/tool source files checked present after the edits.

Visual note: small eyebrow labels ("CarouseLabs" on legal pages, "Contact", "Email", "Response time"…) are no longer forced to UPPERCASE by CSS — the words are the same.

Onboarding emoji (role and goal icons) are kept as they are; removing them would be a copy change.

### New screen-reader-only labels (not visible)

| Label | Where |
| --- | --- |
| "Verification code" | Certificate code field |
| "Remove {topic}" | Remove buttons on onboarding topic chips |
| "Onboarding progress" | Progress bar (its visible text "Step n of 6" is unchanged) |
| "Industries" | Industry suggestions list |
| "Toggle light/dark mode" | Tap & Hold theme button (same words as its existing tooltip) |
| "Example" | The product example beside sign-in / sign-up (visible label on that image) |

## Phase 3a (app frame, Generate, Work on Own Idea, History, Pinned) — copy

No visible line was reworded. Every string in the 21 old source files (the old sidebar, top bar, user menu, banners, Generate, own-idea, History and Pinned files) was checked present in the new code; the only misses were code fragments, not wording.

What moved, no wording changed:

- Sidebar items are now the top bar's **Create · Content · Engage** groups and their sub-tabs, using the same item names ("Generate", "Content Hub", "Toolkit", "Extension", "History", "Pinned", "Settings", "Intern Points").
- The page title that the old top bar showed ("Generate", "History", …) is now the current sub-tab.
- "View Profile", "Billing", "Log out" stay in the account menu; "Settings" (an existing sidebar label) joined them.
- The credit line keeps its three wordings exactly ("{n} credits left", "{n} credits + {m} extra", "{n} / {limit} free credits left").
- Generate's rotating typewriter placeholder is gone. The same suggestions now show as tappable chips, and the field shows its existing label "What do you want to post about?".
- On desktop, the idea confirmation text ("Ready to work on this idea?" + the lock warning + "Let's go →") sits in the detail column beside the list. Phones and tablets still get it as a dialog, with "Cancel".
- History's caption preview ("“…”") is always visible as one line. It used to appear on hover, which pushed the rows below it down.
- "Pin idea" / "Unpin idea" were screen-reader labels and are now also the visible text of the detail column's pin button.

### New labels the approved layout needed

Structural only, under the owner's approval of new labels (2026-10-11).

| Label | Where | Visible? |
| --- | --- | --- |
| "Create", "Content", "Engage" | Top bar groups; mobile tab bar | yes |
| "New post" | Top bar menu (items: "Generate", "Work on Own Idea") | yes |
| "Go to…", "Ctrl K" / "⌘K" | Page search button and dialog | yes |
| "You" | Mobile tab bar: account sheet | yes |
| "Ideas Board" | Sub-tab for /content-hub/ideas (the page's own title) | yes |
| "CarouseLabs Engage for LinkedIn" / "… for X" | Mobile Engage sheet (existing product names) | yes |
| "Skip to content" | First keyboard stop | on focus |
| "Account menu", "Main", "Section", "Pages", "Ideas", "Selected idea", "Suggestions", "Filter", "History", "Pinned ideas" | Screen-reader names of menus, navigation, lists and regions | no |
| "Pin to top" / "Unpin", "Duplicate as new session", "Start over from breakdown", "Delete from history", "Duplicate", "Download" | History buttons: existing tooltips, now also their screen-reader names | no (tooltips unchanged) |

## Phase 3b (idea page, caption / image / carousel flows) — copy

Every string in the 25 old source files (idea page, breakdown, format picker, the three flows, their loading screens and the 14 shared generate components) was checked present in the new code. One deliberate change:

| Line | Before | After | Why |
| --- | --- | --- | --- |
| Carousel Save Draft while saving | "Saving?" | "Saving…" | A garbled character; every other save button says "Saving…" |

What moved, no wording changed:

- Each flow's back links ("Back to breakdown", "Back to platforms", "Back to structure options") and the "Caption for / Image + Caption for / Carousel for" lead-in now sit in a toolbar at the top of the page, with the idea's hook.
- Caption flow: the caption is the canvas; "Copy", "Save Draft", "Schedule for Later" and "Post to LinkedIn" sit in a bar under it. "Regenerate — 1 credit" moved next to the "What should change?" box in the side panel, with Tone, "Apply my voice guidelines", "Alternative Hooks" and "Previous versions".
- Image and carousel results: the image / slides are the canvas; the caption ("Caption") and the waiting game sit in the side panel; "Copy Caption", "Save Draft", "Download HD Image", "Schedule for Later", "Post to LinkedIn" in the bar.
- Idea page: "Choose Output Type" moved beside the breakdown on wide screens.
- Uppercase small labels ("TONE", "CAPTION", "GENERATED SLIDES"…) are no longer forced to capitals by CSS — same words.

### New labels the approved layout needed

| Label | Where | Visible? |
| --- | --- | --- |
| "Platform", "Structure", "Caption", "Format", "Reference", "Image" / "Slides" | Step trail in the flow toolbar ("Caption · 3/3" on small screens) | yes |
| "Settings" (existing word) | Caption flow: folds the side panel away on wide screens | yes |
| "Progress", "Caption settings", "Categories", "Slides" | Screen-reader names of the step trail, side panel, category chips and slide list | no |
| "Caption", "Image + Caption", "Caption + Slides" (existing names) | Screen-reader page headings on the result screens | no |
| "What should change?" | Screen-reader name of the instruction boxes (start of their existing placeholder) | no |
| "Define your caption / image / carousel structure" (existing headings) | Screen-reader names of the custom-structure boxes | no |
| "Remove reference" | Remove button on the uploaded reference image | no |
| "Download slide {n}" | Per-slide download button (visible text stays "Download") | no |

## Phase 4a (Engage for LinkedIn / X, Settings) — copy

No visible line was reworded. Every string in the old files — including the four replaced components (the extension tab strip, the settings tab strip, the old plan card and the old extension plan card) — was checked present in the new code; the only misses were code fragments and class names.

What moved, no wording changed:

- The Engage tabs ("Overview", "Custom tones" / "Reply profiles", "AI agents", "History", "Settings", "Plan & payments") and the Settings tabs ("Profile", "Voice Presets", "Billing", "Referrals", "Start Page", "Account") now sit in the app header's second row. Each page keeps its title: the extension name (which still opens "Your extensions") or "Settings".
- Settings → Billing and the extension "Plan & payments" pages use the plan cards the landing page already used (same values from lib/plans.ts, same badges: "⭐ Most Popular", "Current Plan", "Unlimited", "Chrome extension · Sold separately"). Words that were forced to CAPITALS by CSS ("MOST POPULAR", "FREE PLAN", "CHROME EXTENSION · SOLD SEPARATELY", "YOUR PLAN") now show in their written case.

### New labels

| Label | Where | Visible? |
| --- | --- | --- |
| "More" | Screen-reader name of the extension overview's side column | no |
| "Remove {topic}" | Remove buttons on Settings → Profile topic chips (same label as onboarding) | no |

## Phase 4b (Content Hub, Ideas Board, Toolkit, Thumbnail, Intern Points) — copy

No visible line was reworded. Every string in the old files was checked present in the new code (the only misses were code fragments).

What moved, no wording changed:

- Content Hub's tool icons now show their names on wide screens. The names are the panel titles that already existed: "Ideas Board", "Recurring Slots", "Queue Settings", "Library", "Bulk Upload" (their old tooltips stay as tooltips and screen-reader names).
- "Step 1 · Choose content", "Step 2 · Pick platform", "Step 3 · Date & time", "Tags", "Preview", "Caption", "Platforms", "Images", "Create a Custom Post", "Edit slot" / "New slot", the thumbnail question topic, the blueprint section titles and field names, and the intern status no longer forced to CAPITALS by CSS. ("TASK" / "CUSTOM" on intern entries are written in capitals in the source, so they stay.)
- Ideas Board: each idea's type and "Saved … ago" now sit together under its title in the list ("Note · Saved 3h ago").
- Thumbnail: "Thumbnail" is now also the toolbar title; the reference keeps its existing label "Reference Style (optional)".
- Intern Points: "Leave applications are closed … shown in the calendar below" — on wide screens the calendar is now beside this note rather than below it. Wording kept as written; flag if it should change.

### New labels

| Label | Where | Visible? |
| --- | --- | --- |
| "Reference", "Questions", "Blueprint", "Thumbnail" | Thumbnail step trail (approved layout A pattern) | yes |
| "Toolkit" | Thumbnail toolbar back link (the existing nav name) | yes |
| "Previous month" / "Next month", "Previous week" / "Next week" | Content Hub calendar arrows | no |
| "Close", "Dismiss" | Side panel close; empty-week banner dismiss | no |
| "Date", "Time", "Platform", "Label (optional)" | Unlabelled date / time / platform fields in the hub panel | no |
| "View" , "Tags", "Kind of idea", "Library", "Day", "Color" | Names of segmented controls and chip groups | no |
| "Remove image", "Send", "Delete", "Copy", "Edit", "Pause" / "Resume" | Icon-only buttons that had no name (Delete / Copy / Edit / Pause reuse their old tooltips) | no |
| Day names ("Mon"…), full dates | Day toggles ("M", "T"…) and calendar day numbers | no |

## Phase 5a (admin shell, kit, Dashboard, Users, User Profile, Subscriptions, Posts, Credits, Referrals, Tasks, Analytics, Audit Logs, Settings, Pre-fill Profile) — copy

No visible line was reworded. Every string in the old admin files was checked present (misses were code fragments and class names).

What moved, no wording changed:

- Text that CSS forced to CAPITALS (sidebar group names, table headers, field labels) now shows as written. Words written in capitals in the source stay ("PRO", "FREE", "GROWTH", "SUSPENDED", statuses).
- Dashboard: the nine stat cards became the users headline (Total Users + Pro / Growth / Free Users with their share) and a ledger (Total Posts, Carousels, Images, Credits Used, Est. API Cost with "credits used × $0.025"). The share percentages are new numbers, not new words.
- Users: "All plans / Free / Pro / Growth" moved from a dropdown to chips; the "Actions" column header is now a screen-reader label on the menu column.

### New labels

| Label | Where | Visible? |
| --- | --- | --- |
| "Open menu", "Close menu" | Phone sidebar drawer | no |
| "Expand" | Collapsed sidebar's expand button | no |
| "Admin", "Admin pages" | Names of the sidebar and its navigation | no |
| "Actions for {email}" | Users row menu button | no |
| "Plan", "Bulk actions" | Plan chip group; floating bulk bar | no |
| "Close" | Referrer detail panel close | no |
| "Amount", "Method (e.g. PayPal, bank transfer)", "Internal note about this user…", "Grant credits to selected" | Fields that only had placeholders | no |
| "Thumbnail", "Other" | Analytics "Posts by type" slices (Thumbnail showed as "THUMBNAIL"; other formats fold into "Other") | yes |

## Phase 5b (Engage admin, Interns, Broadcasts, Sequences, Scheduled Emails) — copy

No visible line was reworded. Every string in the old admin files was checked present (misses were code fragments and class names).

What moved, no wording changed:

- Engage Overview, AI, Errors and the intern profile: the same labels and hints, shown as figure rows instead of boxes. On Engage Overview, "Engage users" and "Ever signed in or given access" now sit under the headline number.
- Intern profile tabs ("Overview", "Daily Log", "Leave & Attendance", "Notes", "Support", "Certificates", "Performance Report") are underline tabs; the intern status filter words ("all", "active", "completed", "terminated") are unchanged.

### New labels

| Label | Where | Visible? |
| --- | --- | --- |
| "Intern sections" | Name of the intern profile tab list | no |
| "{label}: {value}" | Screen-reader name of a figure that's a link (e.g. "Paid: 96") | no |

## Follow-up: real logos, no emoji (2026-10-12)

No sentence was reworded. Emoji that sat in front of labels were removed (the words stay):

| Before | After | Where |
| --- | --- | --- |
| "🤖 Auto structure", "✍️ Custom structure", "📋 Template", "{emoji} {template name}" | "Auto structure", "Custom structure", "Template", "{template name}" | Structure tag in the create flows |
| "{emoji} {platform}" | platform logo + "{platform}" | Platform tag |
| "⚠️ Heads up — LinkedIn will show these…" | warning icon + the same sentence | Carousel post dialog |
| "⭐ {badge}" | "{badge}" | Plan card badge |
| 🥇 🥈 🥉 | "1", "2", "3" on gold / silver / bronze discs (screen readers: "Rank 1") | Intern leaderboard, admin interns |

Moved, same words: "Tailored to your profile" now labels the suggestion list on the dashboard (it named the topic field before); the platform card shows "3,000" and "chars" on two lines.
