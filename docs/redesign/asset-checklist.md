# Asset checklist

Phase 0 is not blocked on any of these; the samples use labeled example content. Phase 1 needs the starred rows before the public evidence and testimonial sections can appear.

| Asset | Placement | Spec | Source / owner | Permission | Status | Fallback if missing |
| --- | --- | --- | --- | --- | --- | --- |
| ★ Idea feed + selected idea | Hero, tour step 1 | Light theme, readable hooks, ~1600px wide PNG/WebP | Owner (capture from app) | Owner's own data | needed | Real kit components with "Example" data (already built: StudioPreview, IdeaCard) |
| ★ Caption, image and carousel from one journey | Hero, tour steps 2–3 | Same example idea end to end; slides readable up close | Owner | Owner's own content | needed | Example composition, labeled |
| ★ Content Hub calendar | Tour step 4, tools grid | Real scheduled / published / failed states, safe data | Owner | Owner's own data | needed | Existing calendar view with example entries |
| ★ Engage for LinkedIn in use | Engage section | Screenshot or ≤15s recording, anonymized conversation | Owner | Anonymize others' names | needed | Labeled example panel from verified UI |
| ★ Engage for X in use | Engage section | Separate X capture (not the LinkedIn one) | Owner | Anonymize | needed | Labeled example panel |
| Thumbnail reference → result | Tools grid | Existing pair: `public/images/msedge_GxpOUT38VY.png` → `public/images/chrome_EVsJjSSheP.jpg` | Already in repo | Confirm the reference image may be shown | have (confirm permission) | Keep current pair |
| Testimonials | Testimonials | Exact quote, name, role, optional photo, product context | Owner | Written permission | needed | Section omitted |
| Customer / press logos | Evidence | SVG, permission per logo | Owner | Per logo | needed | Section omitted |
| Verified numbers | Evidence, final CTA | Users, posts created, Chrome Web Store rating with date | Owner (admin analytics, store listing) | — | needed | Omitted; "1,000+ creators" removed |
| Brand mark decision | Nav, footer, favicon, OG image | Approve or reject the proposed SVG (see /design-preview → Brand) | Owner | Not trademark-cleared | decision needed | Keep current logo and `app/icon.png` |
| Open Graph image | Link previews | 1200×630, built in Phase 1 from approved brand + product composition | Built in Phase 1 | — | Phase 1 | Next.js default |
| Social profile URLs | Footer | Real, owner-confirmed | Owner | — | needed | Omitted |
| Store and checkout links | Engage, pricing | Already canonical in `lib/plans.ts` | Repo | — | have | — |
