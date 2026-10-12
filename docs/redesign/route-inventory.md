# Route inventory

Generated from `app/` on 2026-10-11 (Phase 0). The repository is the source of truth: re-run before each phase.

**83 pages.** Phase = the phase that migrates the page. Status: `baseline` = before-screenshots captured at 375/768/1440; `not verified` = needs sign-in or data that can't be used safely locally yet.

| URL pattern | Source | Access | Phase | Main actions | Data | State files | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/admin/analytics` | `app/(admin)/admin/analytics/page.tsx` | Staff only (admin role) | 5 | Admin: /analytics | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/audit-logs` | `app/(admin)/admin/audit-logs/page.tsx` | Staff only (admin role) | 5 | Admin: /audit-logs | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/broadcasts` | `app/(admin)/admin/broadcasts/page.tsx` | Staff only (admin role) | 5 | Admin: /broadcasts | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/credits` | `app/(admin)/admin/credits/page.tsx` | Staff only (admin role) | 5 | Admin: /credits | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/engage/access` | `app/(admin)/admin/engage/access/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/access | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/ai` | `app/(admin)/admin/engage/ai/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/ai | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/audit` | `app/(admin)/admin/engage/audit/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/audit | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/controls` | `app/(admin)/admin/engage/controls/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/controls | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/errors` | `app/(admin)/admin/engage/errors/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/errors | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/health` | `app/(admin)/admin/engage/health/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/health | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage` | `app/(admin)/admin/engage/page.tsx` | Staff only (admin role) | 5 | Admin: /engage | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/sessions` | `app/(admin)/admin/engage/sessions/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/sessions | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/users/[userId]` | `app/(admin)/admin/engage/users/[userId]/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/users/[userId] | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/engage/users` | `app/(admin)/admin/engage/users/page.tsx` | Staff only (admin role) | 5 | Admin: /engage/users | /api/admin/* | loading.tsx, error.tsx | redesigned (Phase 5b) |
| `/admin/interns/[id]/checklist` | `app/(admin)/admin/interns/[id]/checklist/page.tsx` | Staff only (admin role) | 5 | Admin: /interns/[id]/checklist | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/interns/[id]` | `app/(admin)/admin/interns/[id]/page.tsx` | Staff only (admin role) | 5 | Admin: /interns/[id] | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/interns/broadcast` | `app/(admin)/admin/interns/broadcast/page.tsx` | Staff only (admin role) | 5 | Admin: /interns/broadcast | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/interns` | `app/(admin)/admin/interns/page.tsx` | Staff only (admin role) | 5 | Admin: /interns | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin` | `app/(admin)/admin/page.tsx` | Staff only (admin role) | 5 | Admin: dashboard | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/posts` | `app/(admin)/admin/posts/page.tsx` | Staff only (admin role) | 5 | Admin: /posts | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/prefill-user` | `app/(admin)/admin/prefill-user/page.tsx` | Staff only (admin role) | 5 | Admin: /prefill-user | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/referrals` | `app/(admin)/admin/referrals/page.tsx` | Staff only (admin role) | 5 | Admin: /referrals | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/scheduled-emails` | `app/(admin)/admin/scheduled-emails/page.tsx` | Staff only (admin role) | 5 | Admin: /scheduled-emails | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/sequences/[id]` | `app/(admin)/admin/sequences/[id]/page.tsx` | Staff only (admin role) | 5 | Admin: /sequences/[id] | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/sequences/new` | `app/(admin)/admin/sequences/new/page.tsx` | Staff only (admin role) | 5 | Admin: /sequences/new | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/sequences` | `app/(admin)/admin/sequences/page.tsx` | Staff only (admin role) | 5 | Admin: /sequences | /api/admin/* | loading.tsx | redesigned (Phase 5b) |
| `/admin/settings` | `app/(admin)/admin/settings/page.tsx` | Staff only (admin role) | 5 | Admin: /settings | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/subscriptions` | `app/(admin)/admin/subscriptions/page.tsx` | Staff only (admin role) | 5 | Admin: /subscriptions | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/tasks` | `app/(admin)/admin/tasks/page.tsx` | Staff only (admin role) | 5 | Admin: /tasks | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/users/[userId]` | `app/(admin)/admin/users/[userId]/page.tsx` | Staff only (admin role) | 5 | Admin: /users/[userId] | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/admin/users` | `app/(admin)/admin/users/page.tsx` | Staff only (admin role) | 5 | Admin: /users | /api/admin/* | loading.tsx | redesigned (Phase 5a) |
| `/content-hub/ideas` | `app/(app)/content-hub/ideas/page.tsx` | Signed in, onboarding done | 3–4 | Ideas board | /api/ideas-board/* | in-page only | redesigned (Phase 4b) |
| `/content-hub` | `app/(app)/content-hub/page.tsx` | Signed in, onboarding done | 3–4 | Calendar, queue, composer, library, bulk CSV | /api/content-hub/*, post-templates, post-tags, hashtag-groups | in-page only | redesigned (Phase 4b) |
| `/dashboard` | `app/(app)/dashboard/page.tsx` | Signed in, onboarding done | 3–4 | Generate 10 ideas, pin, dismiss, load more | /api/ideas/generate, /api/ideas/more, /api/ideas/suggestions | in-page only | redesigned (Phase 3a) |
| `/extension/agents` | `app/(app)/extension/agents/page.tsx` | Signed in, onboarding done | 3–4 | Engage for LinkedIn: agents | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/billing` | `app/(app)/extension/billing/page.tsx` | Signed in, onboarding done | 3–4 | Engage for LinkedIn: billing | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/history` | `app/(app)/extension/history/page.tsx` | Signed in, onboarding done | 3–4 | Engage for LinkedIn: history | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension` | `app/(app)/extension/page.tsx` | Signed in, onboarding done | 3–4 | Engage for LinkedIn: overview | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/profiles` | `app/(app)/extension/profiles/page.tsx` | Signed in, onboarding done | 3–4 | Engage for LinkedIn: profiles | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/settings` | `app/(app)/extension/settings/page.tsx` | Signed in, onboarding done | 3–4 | Engage for LinkedIn: settings | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/x/agents` | `app/(app)/extension/x/agents/page.tsx` | Signed in, onboarding done | 3–4 | Engage for X: agents | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/x/billing` | `app/(app)/extension/x/billing/page.tsx` | Signed in, onboarding done | 3–4 | Engage for X: billing | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/x/history` | `app/(app)/extension/x/history/page.tsx` | Signed in, onboarding done | 3–4 | Engage for X: history | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/x` | `app/(app)/extension/x/page.tsx` | Signed in, onboarding done | 3–4 | Engage for X: overview | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/x/profiles` | `app/(app)/extension/x/profiles/page.tsx` | Signed in, onboarding done | 3–4 | Engage for X: profiles | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/extension/x/settings` | `app/(app)/extension/x/settings/page.tsx` | Signed in, onboarding done | 3–4 | Engage for X: settings | /api/ext/*, extension billing | in-page only | redesigned (Phase 4a) |
| `/generate/caption` | `app/(app)/generate/caption/page.tsx` | Signed in, onboarding done | 3–4 | Caption: stream, edit, regenerate, publish, schedule | /api/generate/*, credits, LinkedIn | loading.tsx | redesigned (Phase 3b) |
| `/generate/carousel` | `app/(app)/generate/carousel/page.tsx` | Signed in, onboarding done | 3–4 | Carousel flow, PDF | /api/generate/*, image model, jsPDF | loading.tsx | redesigned (Phase 3b) |
| `/generate/image` | `app/(app)/generate/image/page.tsx` | Signed in, onboarding done | 3–4 | Image + caption flow | /api/generate/*, image model, R2 | loading.tsx | redesigned (Phase 3b) |
| `/history` | `app/(app)/history/page.tsx` | Signed in, onboarding done | 3–4 | Search, duplicate, start over, delete | /api/history/* | in-page only | redesigned (Phase 3a) |
| `/idea/[id]` | `app/(app)/idea/[id]/page.tsx` | Signed in, onboarding done | 3–4 | Read breakdown, choose format | /api/ideas/[id]/breakdown (spends credits) | loading.tsx | redesigned (Phase 3b) |
| `/intern` | `app/(app)/intern/page.tsx` | Signed in, onboarding done | 3–4 | Points, leaderboard, calendar, leave, support chat | /api/intern/* | loading.tsx | redesigned (Phase 4b) |
| `/own-idea` | `app/(app)/own-idea/page.tsx` | Signed in, onboarding done | 3–4 | Start from own idea | /api/own-idea/* | in-page only | redesigned (Phase 3a) |
| `/pinned` | `app/(app)/pinned/page.tsx` | Signed in, onboarding done | 3–4 | View and unpin saved ideas | /api/pinned | in-page only | redesigned (Phase 3a) |
| `/settings/account` | `app/(app)/settings/account/page.tsx` | Signed in, onboarding done | 3–4 | Email, security, LinkedIn, notifications, export | Clerk, /api/account/*, /api/linkedin/* | in-page only | redesigned (Phase 4a) |
| `/settings/billing` | `app/(app)/settings/billing/page.tsx` | Signed in, onboarding done | 3–4 | Credits, plan, upgrade, cancel, extension plans | /api/billing/*, Lemon Squeezy | loading.tsx | redesigned (Phase 4a) |
| `/settings` | `app/(app)/settings/page.tsx` | Signed in, onboarding done | 3–4 | Sends to a settings tab | — | in-page only | redesigned (Phase 4a) |
| `/settings/profile` | `app/(app)/settings/profile/page.tsx` | Signed in, onboarding done | 3–4 | Edit profile answers | /api/profile | loading.tsx | redesigned (Phase 4a) |
| `/settings/referrals` | `app/(app)/settings/referrals/page.tsx` | Signed in, onboarding done | 3–4 | Copy link, see referral stats | /api/referrals/* | in-page only | redesigned (Phase 4a) |
| `/settings/start-page` | `app/(app)/settings/start-page/page.tsx` | Signed in, onboarding done | 3–4 | Edit public Start Page | /api/start-page/* | in-page only | redesigned (Phase 4a) |
| `/settings/voice-presets` | `app/(app)/settings/voice-presets/page.tsx` | Signed in, onboarding done | 3–4 | Manage voice presets | /api/profile | in-page only | redesigned (Phase 4a) |
| `/thumbnail` | `app/(app)/thumbnail/page.tsx` | Signed in, onboarding done | 3–4 | Upload reference, answer questions, get thumbnail | /api/thumbnail/* (spends credits) | in-page only | redesigned (Phase 4b) |
| `/toolkit` | `app/(app)/toolkit/page.tsx` | Signed in, onboarding done | 3–4 | Find tools and extensions | lib/plans.ts store links | in-page only | redesigned (Phase 4b) |
| `/sign-in/[[...sign-in]]` | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Public (Clerk) | 2 | Sign in (email, Google) | Clerk | in-page only | redesigned (Phase 2) |
| `/sign-up/[[...sign-up]]` | `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Public (Clerk) | 2 | Create account | Clerk; webhook provisions the user | in-page only | redesigned (Phase 2) |
| `/design-preview` | `app/(internal)/design-preview/page.tsx` | Development only (404 in production) | 0 | Review the design system | Example data only | in-page only | built (Phase 0) |
| `/contact` | `app/(marketing)/contact/page.tsx` | Public | 1–2 | Send a message | POST /api/contact | in-page only | redesigned (Phase 2) |
| `/` | `app/(marketing)/page.tsx` | Public | 1–2 | Landing page; signed-in visitors go to /dashboard | Clerk session check; plans from lib/plans.ts | in-page only | redesigned (Phase 1) |
| `/privacy` | `app/(marketing)/privacy/page.tsx` | Public | 1–2 | Read policy | Static | in-page only | redesigned (Phase 2) |
| `/refund` | `app/(marketing)/refund/page.tsx` | Public | 1–2 | Read policy | Static | in-page only | redesigned (Phase 2) |
| `/start/[slug]` | `app/(marketing)/start/[slug]/page.tsx` | Public | 1–2 | Visit a creator's links | DB startPage + links; /api/start-page/click | in-page only | redesigned (Phase 2) |
| `/terms` | `app/(marketing)/terms/page.tsx` | Public | 1–2 | Read terms | Static | in-page only | redesigned (Phase 2) |
| `/tools/tap-hold-maker` | `app/(marketing)/tools/tap-hold-maker/page.tsx` | Public | 1–2 | Upload, paint teaser, preview, download | None (runs in the browser) | in-page only | redesigned (Phase 2) |
| `/verify-certificate` | `app/(marketing)/verify-certificate/page.tsx` | Public | 1–2 | Check a certificate code | /api/verify-certificate | in-page only | redesigned (Phase 2) |
| `/onboarding/audience` | `app/(onboarding)/onboarding/audience/page.tsx` | Signed in, onboarding not done | 2 | Describe audience | Zustand store | in-page only | redesigned (Phase 2) |
| `/onboarding/completing` | `app/(onboarding)/onboarding/completing/page.tsx` | Signed in, onboarding not done | 2 | Timed setup screen, then /dashboard | Clears the store | in-page only | redesigned (Phase 2) |
| `/onboarding/goals` | `app/(onboarding)/onboarding/goals/page.tsx` | Signed in, onboarding not done | 2 | Pick goals and primary goal | Zustand store | in-page only | redesigned (Phase 2) |
| `/onboarding/identity` | `app/(onboarding)/onboarding/identity/page.tsx` | Signed in, onboarding not done | 2 | Pick role | Zustand store (sessionStorage) | in-page only | redesigned (Phase 2) |
| `/onboarding/industry` | `app/(onboarding)/onboarding/industry/page.tsx` | Signed in, onboarding not done | 2 | Pick industry, describe business | Zustand store | in-page only | redesigned (Phase 2) |
| `/onboarding` | `app/(onboarding)/onboarding/page.tsx` | Signed in, onboarding not done | 2 | Sends to the first step | — | in-page only | redesigned (Phase 2) |
| `/onboarding/topics` | `app/(onboarding)/onboarding/topics/page.tsx` | Signed in, onboarding not done | 2 | Pick 3–7 topics | Zustand store | in-page only | redesigned (Phase 2) |
| `/onboarding/voice` | `app/(onboarding)/onboarding/voice/page.tsx` | Signed in, onboarding not done | 2 | Pick up to 2 tones, finish | POST /api/profile | in-page only | redesigned (Phase 2) |
| `/extension-connect` | `app/extension-connect/page.tsx` | Signed in (extension handshake) | 2 | Link a browser extension to the account | /api/ext/auth/exchange | in-page only | redesigned (Phase 2) |

## Redirects and non-visual routes — keep untouched

| Route | Source | Behaviour |
| --- | --- | --- |
| `/checkout/extension` (`?platform=x`) | `app/checkout/extension/route.ts` | Sends to sign-up if needed, then to the Lemon Squeezy checkout for that extension |
| `/l/[slug]` | `app/l/[slug]/route.ts` | Counts the click, redirects to the stored URL |
| `/robots.txt` | `app/robots.ts` | Robots rules |
| `/sitemap.xml` | `app/sitemap.ts` | Sitemap — must not list /design-preview |
| Subdomains | `proxy.ts` | admin.carouselabs.com → /admin, employee.carouselabs.com → /intern |
| Signed-in `/` | `app/(marketing)/page.tsx` | Redirects to /dashboard |

## API routes — not redesigned

187 route handlers. Presentation work must not change their requests, responses or auth.

<details><summary>Full list</summary>

- `/api/account/delete`
- `/api/account/export`
- `/api/admin/analytics`
- `/api/admin/audit-logs`
- `/api/admin/broadcasts`
- `/api/admin/credits/bulk`
- `/api/admin/credits/reset-pro`
- `/api/admin/email-templates`
- `/api/admin/email-templates/[id]`
- `/api/admin/engage/ai`
- `/api/admin/engage/audit`
- `/api/admin/engage/controls`
- `/api/admin/engage/errors`
- `/api/admin/engage/export`
- `/api/admin/engage/grants`
- `/api/admin/engage/grants/[grantId]`
- `/api/admin/engage/health`
- `/api/admin/engage/overview`
- `/api/admin/engage/prompts`
- `/api/admin/engage/sessions`
- `/api/admin/engage/sessions/[tokenId]`
- `/api/admin/engage/users`
- `/api/admin/engage/users/[userId]`
- `/api/admin/engage/users/[userId]/controls`
- `/api/admin/engage/users/[userId]/grants`
- `/api/admin/engage/users/[userId]/notes`
- `/api/admin/engage/users/[userId]/reset-usage`
- `/api/admin/engage/users/[userId]/sessions`
- `/api/admin/engage/users/[userId]/suspend`
- `/api/admin/engage/users/[userId]/tags`
- `/api/admin/engage/users/bulk`
- `/api/admin/interns`
- `/api/admin/interns/[id]`
- `/api/admin/interns/[id]/certificates`
- `/api/admin/interns/[id]/certificates/[certId]`
- `/api/admin/interns/[id]/checklist`
- `/api/admin/interns/[id]/entries`
- `/api/admin/interns/[id]/entries/[entryId]`
- `/api/admin/interns/[id]/extend`
- `/api/admin/interns/[id]/leave/[leaveId]`
- `/api/admin/interns/[id]/messages`
- `/api/admin/interns/[id]/notes`
- `/api/admin/interns/[id]/notes/[noteId]`
- `/api/admin/interns/[id]/status`
- `/api/admin/interns/broadcast`
- `/api/admin/posts`
- `/api/admin/prefill-user`
- `/api/admin/referrals`
- `/api/admin/referrals/[userId]`
- `/api/admin/scheduled-emails`
- `/api/admin/scheduled-emails/[id]`
- `/api/admin/sequences`
- `/api/admin/sequences/[id]`
- `/api/admin/sequences/[id]/engagement`
- `/api/admin/settings`
- `/api/admin/stats`
- `/api/admin/tasks`
- `/api/admin/tasks/[id]`
- `/api/admin/users`
- `/api/admin/users/[userId]`
- `/api/admin/users/[userId]/credits`
- `/api/admin/users/[userId]/plan`
- `/api/admin/users/[userId]/suspend`
- `/api/admin/users/bulk-plan`
- `/api/admin/users/bulk-suspend`
- `/api/billing/cancel-subscription`
- `/api/billing/checkout`
- `/api/billing/upgrade`
- `/api/contact`
- `/api/content-hub/bulk-upload`
- `/api/content-hub/custom-post`
- `/api/content-hub/custom-post/upload`
- `/api/content-hub/posts`
- `/api/content-hub/posts/[id]/duplicate`
- `/api/content-hub/queue`
- `/api/content-hub/queue/[id]`
- `/api/content-hub/queue/pause-all`
- `/api/content-hub/queue/shuffle`
- `/api/content-hub/recurring`
- `/api/content-hub/recurring/[id]`
- `/api/content-hub/scheduled`
- `/api/content-hub/scheduled/[id]`
- `/api/content-hub/suggestions`
- `/api/credits/consume`
- `/api/cron/comment-history-cleanup`
- `/api/cron/intern-weekly-digest`
- `/api/cron/intern-weekly-performance-email`
- `/api/cron/process-email-sequences`
- `/api/cron/publish-scheduled-emails`
- `/api/cron/publish-scheduled-posts`
- `/api/cron/renewal-reminder`
- `/api/cron/weekly-summary-email`
- `/api/ext/agents`
- `/api/ext/agents/[id]`
- `/api/ext/agents/builder`
- `/api/ext/agents/test`
- `/api/ext/auth/exchange`
- `/api/ext/auth/signout`
- `/api/ext/checkout`
- `/api/ext/config`
- `/api/ext/connection-note`
- `/api/ext/connection-profiles`
- `/api/ext/connection-profiles/[id]`
- `/api/ext/contacts`
- `/api/ext/contacts/[id]`
- `/api/ext/devices`
- `/api/ext/devices/[id]`
- `/api/ext/errors`
- `/api/ext/generate`
- `/api/ext/history`
- `/api/ext/history/[id]`
- `/api/ext/me`
- `/api/ext/message`
- `/api/ext/message-profiles`
- `/api/ext/message-profiles/[id]`
- `/api/ext/payments`
- `/api/ext/profiles`
- `/api/ext/profiles/[id]`
- `/api/ext/profiles/test`
- `/api/ext/rewrite`
- `/api/ext/settings`
- `/api/ext/x/message`
- `/api/ext/x/profiles`
- `/api/ext/x/profiles/[id]`
- `/api/ext/x/profiles/test`
- `/api/ext/x/reply`
- `/api/ext/x/rewrite`
- `/api/ext/x/settings`
- `/api/game/winner`
- `/api/generate/caption`
- `/api/generate/carousel-images`
- `/api/generate/carousel-prompt`
- `/api/generate/image`
- `/api/generate/image-prompt`
- `/api/hashtag-groups`
- `/api/hashtag-groups/[id]`
- `/api/history`
- `/api/history/[ideaId]`
- `/api/ideas-board`
- `/api/ideas-board/[id]`
- `/api/ideas/[id]/breakdown`
- `/api/ideas/[id]/dismiss`
- `/api/ideas/[id]/duplicate`
- `/api/ideas/[id]/pin`
- `/api/ideas/generate`
- `/api/ideas/more`
- `/api/ideas/suggestions`
- `/api/intern/leaderboard`
- `/api/intern/leave`
- `/api/intern/me`
- `/api/intern/messages`
- `/api/linkedin/callback`
- `/api/linkedin/connect`
- `/api/linkedin/disconnect`
- `/api/linkedin/post`
- `/api/linkedin/status`
- `/api/maintenance-status`
- `/api/me`
- `/api/own-idea/carousel-structure`
- `/api/own-idea/generate`
- `/api/own-idea/presentation-structure`
- `/api/pinned`
- `/api/post-tags`
- `/api/post-tags/[id]`
- `/api/post-templates`
- `/api/post-templates/[id]`
- `/api/posts`
- `/api/posts/[id]`
- `/api/profile`
- `/api/proxy-image`
- `/api/referrals/me`
- `/api/referrals/reminder`
- `/api/short-links`
- `/api/short-links/[id]`
- `/api/start-page`
- `/api/start-page/avatar`
- `/api/start-page/check-slug`
- `/api/start-page/click/[id]`
- `/api/start-page/links`
- `/api/start-page/links/[id]`
- `/api/thumbnail/chat`
- `/api/thumbnail/extract-document`
- `/api/thumbnail/generate`
- `/api/verify-certificate`
- `/api/webhooks/clerk`
- `/api/webhooks/lemonsqueezy`
- `/api/webhooks/resend`

</details>
