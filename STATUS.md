## CAROUSELABS — BUILD STATUS

### Session 1 — COMPLETE ✅

**Completed:**
- ✅ Next.js 14 App Router project (TypeScript + Tailwind CSS)
- ✅ shadcn/ui setup (components.json + base UI components)
- ✅ 42 route files across all route groups
- ✅ Route groups: `(marketing)`, `(auth)`, `(onboarding)`, `(app)`
- ✅ All API routes: ideas, posts, profile, billing, webhooks, LinkedIn, upload
- ✅ Prisma schema — all 9 tables (User, Profile, Idea, Breakdown, Post, Slide, Subscription, LinkedInAccount, UsageCounter)
- ✅ All 8 enums (Plan, IdeaMode, IdeaCategory, PostFormat, PostStatus, SlideRole, SubscriptionStatus)
- ✅ Clerk middleware.ts — protects `(app)` routes, leaves `(auth)` + `(marketing)` public
- ✅ All npm dependencies installed
- ✅ Lib utilities: db, redis, anthropic, openai, r2, resend, razorpay, auth, encryption, queue, posthog
- ✅ Hooks: use-ideas, use-local-storage
- ✅ Email templates: welcome, post-ready, subscription-confirmed
- ✅ BullMQ workers: idea-worker, post-worker
- ✅ Design system: #080810 bg, #7C3AED accent, Inter font, dark mode

---

### Session 2 — NOT STARTED

**Next:**
- Clerk webhook → create User in DB on sign-up
- Onboarding flow (multi-step profile form)
- Sidebar layout for `(app)` group
- Flow 1: Idea generation (Mode A auto + Mode B seeded) with SSE streaming

---

## Stack:
- Next.js 14 App Router + TypeScript + Tailwind CSS
- shadcn/ui components
- Prisma + Supabase PostgreSQL
- Upstash Redis + BullMQ
- Clerk Auth (email magic link + Google OAuth)
- Anthropic Claude (sonnet + haiku)
- OpenAI DALL-E 3 / gpt-image-1
- Cloudflare R2
- Razorpay
- Resend + React Email
- pdf-lib
- Framer Motion
- Sentry + PostHog
- Vercel (frontend) + Railway (workers)
