# Layout directions (Phase 0 rework)

The owner rejected the first sample layouts as too generic (sidebar → heading → card rows → buttons) and asked for structural alternatives before Phase 1. Two directions now exist as clickable prototypes, built on the unchanged design system and the same example story.

**Open:** `npm run dev`, then http://localhost:3000/design-preview/directions (development only).

| | A · Studio desk | B · Focus flow |
| --- | --- | --- |
| Navigation | Two-tier top bar: Create · Content · Engage, active area's pages as sub-tabs; New post menu, credits, account menu. Mobile: top bar + full-screen menu + scrollable sub-tabs | Slim top bar (breadcrumb, Go to… Ctrl/⌘ K), floating dock with Create · Content · Engage menus. Mobile: bottom tab bar |
| Generate | Brief line → category filters → numbered editorial list; sticky detail column ("Develop this idea"); sheet on mobile | One idea at a time, large; Use · Pin · Skip with keyboard (← → P X Enter); grouped index of all ten |
| Create | Toolbar with step trail; centre canvas (Write · Slides · Post preview); collapsible settings panel; fixed Download · Schedule · Post bar | Split: write left, live post preview right; settings as chips over the preview; one Finish panel; navigation hidden while editing. Mobile: Write → Preview → Finish |
| Landing opening | Headline row, then a wide clickable product stage (find → write → design → publish) with the Engage reply attached | "Create posts / Reply faster" switch changes the headline and CTA; proof is a feed with a studio post and an Engage reply |

## Recommendation

**Direction A, borrowing B's mobile tab bar and the Go to… (⌘K) palette.**

- **Noticed first:** the work — the brief on Generate, the post on the canvas; on the landing page, one headline and then the real product.
- **Starting the main task:** type a topic (or leave it blank) → scan ten numbered ideas → open one → "Develop this idea". New post is in the top bar everywhere.
- **Secondary tools:** each area's sub-tabs, the account menu (settings, billing, referrals, Start Page, all tools), the editor's side panel.
- **Why it fits:** people do a batch of work per visit; a list with detail beats one-at-a-time for 10–30 ideas; an 8-slide carousel needs the centre; the calendar needs full width; three activities match the three products, giving the separately sold extensions a clear home.
- **Trade-offs:** ~100px of header height (B: 56px) — sub-row can tuck away on scroll; Engage's sub-row is dense (platform switch + six tabs); calmer but less novel than B's spotlight; A's own mobile menu is weaker than B's tab bar (hence the borrow). B's audience switch is worth testing for the Engage section in Phase 1.

## Every destination is mapped

All 28 customer-app destinations keep their routes; the full placement table for both directions is on the directions page (`app/(internal)/design-preview/directions/_proto/nav.ts`). Intern accounts still see only Intern Points. Admin keeps its sidebar.

## Verified (2026-10-11)

- 12 combinations (2 directions × 3 screens × desktop/mobile) in light and dark: no console errors, no horizontal overflow.
- 32 click-through checks pass: navigation in both shells, account menus, platform switch, idea selection and detail, editor panel toggle, ratio change, schedule/post confirmations (example toasts only), B's keyboard shortcuts and Go to… palette, mobile sheets staying inside the phone frame, landing stage tabs and audience switch.
- Nothing calls a real API; every action shows "Example only — nothing was generated, posted or scheduled."

## Decisions needed

1. Which direction (or which parts of each)?
2. Landing opening: A's product stage, B's audience switch + feed, or A with B's switch in the Engage section?
3. Mobile app navigation: A's menu sheet or B's tab bar?
