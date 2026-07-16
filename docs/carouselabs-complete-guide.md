# CarouseLabs — The Complete Guide

> A full, feature-by-feature walkthrough of everything CarouseLabs is and does — every route, every flow, every prompt, every setting. Written from the actual codebase, not assumptions.

---

## Table of Contents

1. [Product Overview](#section-1--product-overview)
2. [The Complete User Journey](#section-2--the-complete-user-journey)
3. [Every Feature in Detail](#section-3--every-feature-in-detail)
4. [AI Models Used](#section-4--ai-models-used)
5. [Content Output Quality](#section-5--content-output-quality)
6. [Key Differentiators vs Competitors](#section-6--key-differentiators-vs-competitors)
7. [Technical Stack (Plain-English)](#section-7--technical-stack)

---

# SECTION 1 — PRODUCT OVERVIEW

## What CarouseLabs is (in one paragraph)

CarouseLabs is an AI content studio for people who want to publish consistently on LinkedIn (and repurpose for Instagram and Twitter/X) without spending hours writing and designing. You tell it once about your business — your role, industry, audience, goals, and voice — and from then on it generates fresh post ideas grounded in real, recent news, expands any idea into a full deep-dive breakdown, ghostwrites a scroll-stopping caption in your voice, and produces the matching visuals: a single AI-generated image, or a complete 7–8 slide carousel. Every generated post can be downloaded (images or a print-ready PDF) or published straight to a connected LinkedIn account. It runs on Claude Sonnet 4.5 for all the writing and OpenAI's `gpt-image-2` model for all the imagery.

## Who it's for (target users)

The onboarding "identity" step maps the audience exactly:

- **Founders / Entrepreneurs** 🚀
- **Content Creators** ✨
- **Freelancers** 💼
- **Operators / Managers** ⚙️
- **Consultants** 🎯
- **Executives / CXOs** 👔
- **Other** 🌟

In short: solo professionals and personal-brand builders who know LinkedIn matters for leads, hiring, and reputation but don't have a ghostwriter or designer on staff.

## The core problem it solves

Consistent, high-quality LinkedIn content is a grind. It requires three separate skills most people don't have time for:

1. **Coming up with ideas** that are timely and on-brand (not generic).
2. **Writing captions** that actually stop the scroll and sound human.
3. **Designing visuals** — single images and multi-slide carousels — that look premium.

Generic AI tools help with #2 but not #1 or #3, and they don't know your voice or publish for you. CarouseLabs collapses the entire idea → breakdown → caption → visual → publish pipeline into one guided flow.

## The core value proposition

**"From idea to published post in minutes."** Tell CarouseLabs about your business once, and it becomes a idea engine + ghostwriter + designer + publisher that already knows your niche, audience, and voice — and stays grounded in real, current news so ideas never feel stale or hallucinated.

## Pricing (Free vs Pro)

| | **Free** | **Pro** |
|---|---|---|
| **Price** | $0 forever | **$24 / month** (billed monthly, cancel anytime) |
| **Content credits** | **1 post, lifetime** | **30 credits / month** |
| **Idea generation** | Yes (rate-limited: up to 10 generations/hour) | Yes |
| **Post breakdown / deep dive** | Yes | Yes |
| **Caption generation** | Yes | Yes |
| **Image + Caption** | Yes | Yes |
| **Carousel (7–8 slides)** | ❌ Locked (Pro-only) | ✅ Yes |
| **PDF export of carousels** | ❌ | ✅ |
| **Priority support** | — | ✅ |

Key mechanics (from `lib/credits.ts`):
- A **credit is consumed each time a NEW breakdown is generated** (either from a picked idea or the "My Own Idea" flow). Everything downstream of a breakdown — captions, images, carousel slides, regenerations — does **not** cost additional credits.
- **Free** users get `FREE_LIFETIME_POSTS = 1` — a single lifetime breakdown, consumed atomically so it can't be double-spent.
- **Pro** users get `MONTHLY_CREDITS = 30`, spent first from the monthly allowance, then from any purchased "extra credits" (which can carry an expiry date).
- Cached breakdowns are free — reopening an idea whose breakdown already exists never re-charges.

Pricing is displayed on the marketing page (`components/landing/Pricing.tsx`) and enforced in the billing page (`app/(app)/settings/billing/page.tsx`), where the Pro upgrade is described as **"$24/month — 30 content credits every month, unlimited ideas, full image & carousel generation, and PDF downloads."**

---

# SECTION 2 — THE COMPLETE USER JOURNEY

This is the entire experience, in order, from first visit to a published post.

## 2.1 Landing on carouselabs.com

The marketing site (`app/(marketing)/`) presents:
- **Hero** — headline *"Create viral content for every platform"* with the subhead *"Tell CarouseLabs about your business and it generates post ideas, writes your captions, and creates the images and carousels — ready for LinkedIn, Instagram, and Twitter/X in minutes."* Floating badges animate ("Caption Generated", "10 ideas · 30 seconds", "Posted to LinkedIn") and a live typewriter prompt demos the product.
- **How It Works** — three steps: *Get AI-powered ideas → Build your caption → Generate images & carousels.*
- **Features grid, FAQ, Pricing** (Free vs Pro, above), and a **Contact** section (form posts to `/api/contact`).
- Programmatic SEO pages under `/for/[slug]` and `/ideas/[slug]`, plus `robots.ts` and `sitemap.ts`.
- CTAs everywhere point to **`/sign-up`** ("Start for free" / "Start with Pro").

Legal pages: `/privacy`, `/terms`, `/refund`.

## 2.2 Signing up (Clerk + Google OAuth)

Auth is handled entirely by **Clerk** (`app/(auth)/sign-in/[[...sign-in]]` and `sign-up/[[...sign-up]]`, using Clerk's catch-all route pattern). This gives you email/password **and Google OAuth** sign-in out of the box, with Clerk's hosted UI styled to match the app (`lib/clerkAppearance.ts`).

Behind the scenes:
- A **Clerk webhook** (`/api/webhooks/clerk`) fires on user creation to provision the `User`, `Subscription` (defaults to FREE), and `UsageCounter` rows, and to send the **Welcome email** ("Welcome to CarouseLabs 🎨").
- The app is also **self-healing**: if a user somehow reaches an API route before the webhook lands, `getCurrentUser()` (`lib/auth.ts`) creates the missing rows on the fly.

## 2.3 Onboarding flow (every step)

New users are routed to **`/onboarding`**, which redirects to the first step. Onboarding state lives in a Zustand store persisted to `sessionStorage` (`lib/store/onboardingStore.ts`) so progress survives refreshes. The steps:

### Step 1 — Identity (`/onboarding/identity`)
*"Which best describes you?"* Pick one role from the 7 options (Founder, Creator, Freelancer, Operator, Consultant, Executive, Other). Required to continue.

### Step 2 — Industry (`/onboarding/industry`)
*"What's your industry?"*
- **Industry** — a searchable dropdown of 22 industries (Technology & SaaS, Marketing & Advertising, Finance & Investing, AI & Data Science, Cybersecurity, … full list in `lib/profile/options.ts`).
- **Describe your business** — free text, up to 500 words (e.g. *"I help B2B SaaS founders grow with content"*).
Both required.

### Step 3 — Topics (`/onboarding/topics`)
*"What do you post about?"* A tag input. You must either **type at least 1 custom topic** or **pick 3+ from the 12 suggestions** (Leadership, Personal Branding, Entrepreneurship, Marketing Strategy, Productivity, Career Growth, AI & Technology, Sales, Remote Work, Company Culture, Fundraising, Content Creation). Min 3, max 7 tags total.

### Step 4 — Audience (`/onboarding/audience`)
*"Who are you writing for?"* Four fields:
- **Their Job Role** (max 5 words) — e.g. Marketing Manager, CTO.
- **Seniority Level** — one of Entry-level, Mid-level, Senior, Manager, Director, Executive/C-suite.
- **Their Industry** (max 5 words).
- **Core Problem They Face** (max 200 words).
All required.

### Step 5 — Goals (`/onboarding/goals`)
*"What are your content goals?"* Multi-select from 5 goals (Build personal brand, Generate leads & clients, Grow my audience, Establish thought leadership, Educate my audience). Tap a selected goal to mark it **Primary**. Skippable. Requires a primary goal to continue normally.

### Step 6 — Voice (`/onboarding/voice`)
*"What's your content voice?"* Choose **up to 2 tones** from 5, each with a live preview line:
- **Professional & Authoritative** — *"Our analysis of 500 B2B deals reveals three patterns most founders miss."*
- **Conversational & Relatable** — *"I almost quit last Tuesday. Here's what stopped me."*
- **Inspirational & Motivational** — *"Stop waiting for permission. Build the thing now."*
- **Educational & Informative** — *"5 things no one tells you about scaling to $1M ARR:"*
- **Bold & Provocative** — *"Cold outreach is dead. The era of content-led growth is here."*

Clicking **Finish** (or Skip) calls **`POST /api/profile`**, which:
- Writes the profile columns to the DB. Onboarding fields are packed into the schema: `headline` = role, `industry` = `"{industry} — {niche description}"`, `targetAudience` = JSON `{role, seniority, industry, problem}`, `contentPillars` = topics array, `writingStyle` = JSON `{role, tones, goals, primaryGoal}`.
- Marks `onboardingDone = true`.
- On **first** completion only, sends the **Onboarding Complete email** ("You're all set! Let's create your first post").

### Step 7 — Completing (`/onboarding/completing`)
A 3-second animated "Setting everything up…" screen cycling through messages ("Analyzing your content DNA…", "Calibrating your voice profile…", …), then it clears the onboarding store and routes to **`/dashboard`**.

## 2.4 Reaching the dashboard (`/dashboard`)

The app shell (`app/(app)/layout.tsx`) wraps every logged-in page with a **Sidebar** (Dashboard, My Idea, History, Pinned, Settings), a **Topbar**, and a **Plan badge**. The dashboard itself is centered on one thing: the **Generate Bar**.

- When empty, the Generate Bar sits at the bottom center with an empty-state prompt ("Generate your first ideas").
- A **typewriter placeholder** cycles through AI-generated "what to post about" suggestions tailored to your profile (fetched from `/api/ideas/suggestions`, cached in `localStorage`; falls back to generic prompts if none).
- You can **type a topic** or **leave it blank** ("we'll generate ideas for you").

## 2.5 Getting post ideas

Click **Generate** (or press Enter). This calls **`POST /api/ideas/generate`**:

1. **Rate limit** — 10 generations/hour per user (Upstash Redis).
2. **Real news fetch** — CarouseLabs hits **NewsAPI.org** for real headlines from the **last 48 hours** matching your topic (or your industry if blank). It filters for relevance (headline/description must contain ≥2 of your query words) and keeps up to 5.
3. **Claude call** — a single Claude Sonnet 4.5 completion generates **10 ideas** in a strict structure:
   - **3 Latest News** ideas locked to the real NewsAPI headlines (if none are found, these fall back to Trending — Claude is explicitly forbidden from inventing news).
   - **3 Trending Topic** ideas.
   - **3 Industry Topic** ideas.
   - **1 Random but Relevant** idea.
4. Each idea is parsed from the format `[Category] "Hook" -> Post Type | CTA: "..."` (with a robust multi-tier parser that tolerates markdown, unicode arrows, and formatting drift), saved to the DB, and returned to the feed.

The bar flies to the top and the 10 ideas drop in as cards. Each **Idea Card** shows the hook, a category badge, and post type, with **Pin** and **Dismiss** actions. **Load More** fetches another 10 (via `/api/ideas/more`, which passes already-shown hooks so nothing repeats), up to 30 on screen.

## 2.6 Clicking an idea → getting the breakdown

Clicking an idea opens **`/idea/[id]`**. This page (via `IdeaWorkspace`) immediately generates the **breakdown** — the deep-dive content build — if one doesn't exist yet:

- **`POST /api/ideas/[id]/breakdown`** — **consumes 1 credit** (unless a breakdown is already cached, which is free).
- Claude Sonnet 4.5 acts as *"a world-class LinkedIn content strategist and ghostwriter"* and **builds the full content**, adapting to the idea type (list, story, hot take, or educational). It returns:
  - `deepDive` — 600–800 words with **bold headers** and rich paragraphs.
  - `refinedHook` — the sharpest version of the hook.
  - `keyTalkingPoints` — 4–5 points, semicolon-separated.
  - `strongEndingLine` — one punchy closer.
- A topic guard (`validateContentTopic`) blocks off-topic misuse (code, homework, recipes, translation) *before* spending a credit — showing a friendly "That's not a content topic" card instead.

The deep dive renders as formatted markdown (bold section headers, bullets, paragraphs). Below it sits the **Format Picker**.

## 2.7 Choosing a format

The **Format Picker** offers three output types:
- **Caption Only** — a scroll-stopping caption, ready to post.
- **Image + Caption** — caption plus a single AI-generated visual.
- **Caption + Slides** — caption plus a full 7–8 slide carousel *(Pro-only; Free users see a lock and are routed to upgrade)*.

The first choice is confirmed with a "Lock in this format?" dialog and then **locked for that session** (stored in `localStorage`) — you pick a lane and commit to it. Starting a new session lets you try a different format.

## 2.8 Generating content

Each format is a guided, multi-step flow (detailed in Section 3). In every case, the caption streams in live from Claude, you can regenerate/edit it, choose an image ratio, optionally upload a style reference, and generate visuals. While images generate, a **precision-timing mini-game** keeps you entertained.

## 2.9 Posting to LinkedIn

Every generated post ends with a **Post to LinkedIn** button. If your LinkedIn account is connected (Settings → Account), one click publishes the caption + image(s) to your feed via LinkedIn's API and returns a "View post →" link. Not connected? The button nudges you to Settings. Carousels warn you first that LinkedIn renders multiple images as separate images (not swipeable slides) and suggest the PDF route for a true swipe deck. You can also just **Download** the image/PDF and post manually.

---

# SECTION 3 — EVERY FEATURE IN DETAIL

## Feature 1 — AI Idea Generation

**What it does:** Generates 10 timely, on-brand LinkedIn post ideas per batch, grounded in real news.

**How to use it:**
1. On the dashboard, type a topic in the Generate Bar (or leave blank).
2. Click **Generate**.
3. Read the 10 idea cards. Click **Load More** for another 10 (up to 30).
4. **Pin** ideas you like, **Dismiss** ones you don't.
5. Click an idea to open its workspace.

**Behind the scenes (`app/api/ideas/generate/route.ts` + `lib/ai/prompts/ideas.ts`):**
- **NewsAPI integration** — `fetchRealNews()` queries `newsapi.org/v2/everything` for the last 48 hours on your niche, sorted by `publishedAt`, page size 10, English. Results are relevance-filtered (≥2 query-word matches in title/description), top 5 kept, formatted as `- {title} ({date}) — {source}`. The API key is redacted from logs. If NewsAPI has no key / no results, the block is empty and Claude is told **not to fabricate news** — those 3 slots fall back to Trending.
- **Two prompt modes:**
  - **Mode A** (blank topic) — ideas from your profile alone.
  - **Mode B** (typed topic) — all 10 ideas tie back to your input, interpreted generously (a topic, a rough thought, a week's event, a question, a hot take).
- **Anti-repetition rules** and a random seed are injected so every batch feels fresh and varies hook style, angle, and sub-topic.
- The real headlines are placed at the very top of the prompt with a hard "⚠️ STOP. READ THIS FIRST" instruction locking the Latest News ideas to those exact headlines.
- **Parsing** (`lib/ai/parsers/ideas.ts`) is 3-tier: strict format match → loose keyword match → raw logging. Categories map to DB enums (`Latest News`→TRENDING/INDUSTRY, `Trending`→TRENDING/GROWTH, `Industry`→EVERGREEN/INDUSTRY, `Random`→PERSONAL/OTHER).

**The 10-ideas format:** `[Category] "Hook/Post Idea" -> Post Type | CTA: "..."`, e.g. `[Trending] "AI won't replace creators. Creators using AI will." -> Text Post | CTA: "Agree?"`

**Dashboard idea suggestions:** The Generate Bar's typewriter placeholder pulls personalized "what to post about" prompts from `/api/ideas/suggestions` (cached on the profile and only regenerated by Claude when your profile inputs change). Editing your profile clears this cache so fresh suggestions appear.

**My Own Idea feature** (`/my-idea`): For when you already know what to post. You provide:
- **Your idea/topic** (required) — e.g. *"I just closed my first $100k deal. Here's what I learned…"*
- **Your angle/POV** (optional).
- **Specific points to cover** (optional).

`POST /api/my-idea/generate` then **consumes 1 credit** and runs Claude Sonnet 4.5 **with web search enabled** (the `web_search` server tool, with a pause-turn resume loop) to ground the deep dive in **real, verified, current facts** — minimum **1100 words**, structured into 5–7 sections with bold headers and short bullet points in plain English. It creates a PERSONAL/OTHER idea and its breakdown, then drops you on `/idea/[id]`. Off-topic input is blocked by the same topic guard.

---

## Feature 2 — Breakdown / Deep Dive

**What it does:** Turns a one-line idea into fully-built post content that everything downstream (caption, image, carousel) is generated from.

**What a breakdown contains:**
- **`refinedHook`** — the sharpest, most compelling LinkedIn hook line.
- **`deepDive`** — 600–800 words of real, structured content with `**bold headers**` and 3–5 sentence paragraphs (no fluff, simple English, real examples over generics). The "My Own Idea" variant is 1100+ words with web-sourced facts.
- **`keyTalkingPoints`** — 4–5 main points, semicolon-separated (these become the carousel body slides).
- **`strongEndingLine`** — one punchy, memorable closer (becomes the carousel CTA slide).

**How it's generated:** `POST /api/ideas/[id]/breakdown`. A single Claude Sonnet 4.5 call (`max_tokens: 3000`, no tools) with a prompt that instructs Claude to **build** the content, not summarize it — adapting its structure to whether the idea is a list, story, opinion/hot take, or educational piece. The JSON response is extracted with a fence/brace-tolerant parser and **cached** in the `Breakdown` table.

**Depth and quality:** The prompt demands real specific examples, real names/numbers where possible, 5–7 sections, confident and direct writing "like you're talking to a friend," and "every sentence must earn its place." Because captions and visuals are all built *from* this deep dive, its depth is what makes the downstream content feel substantive rather than generic.

**Credits:** Generating a **new** breakdown costs 1 credit. Reopening a cached breakdown is free. Charging happens *after* the topic-validity check, so a rejected off-topic idea never burns a credit.

---

## Feature 3 — Caption Generation

**What it does:** Ghostwrites a scroll-stopping LinkedIn caption from the breakdown, streamed live.

**Caption-Only flow (`/generate/caption`):**
1. Open the caption page from the Format Picker.
2. (If you have saved voice guidelines) tick **"Apply my voice guidelines."**
3. Optionally pick a **tone** from the Tone Selector.
4. Click **Generate Caption** — the caption **streams in token-by-token** into an editable box.
5. After generation you get **3 alternative opening hooks** you can swap into line 1.
6. Refine with the **custom instruction box** + **Regenerate**, or edit the text directly.
7. **Copy Caption** or **Post to LinkedIn**.

**Behind the scenes (`app/api/generate/caption/route.ts`):**
- The system prompt is a detailed **"top 0.1% LinkedIn ghostwriter"** instruction with explicit storytelling rules (open with a scroll-stopper, never start with "I", use the "but then…" flip, short punchy paragraphs, generous white space, end with a discussion question), a proven line-by-line structure, and a **1500–2500 character** target (hard cap under 3000).
- Output format is the caption (with 7–8 hashtags) followed by `---HOOKS---` and 3 alternative openers. The client splits on that delimiter.
- The response is **streamed** as plain text via a `ReadableStream`.
- The generated caption is saved to a `Post` (`/api/posts`) so revisiting the idea restores it.

**How voice presets affect the caption:** Your profile tones (set in onboarding / Settings) are packed into the profile context that feeds the prompt (`Tone: professional, bold`). The **Tone Selector** on the caption page can also override the tone for a single generation (*"Rewrite entirely in a {tone} voice throughout"*).

**How voice guidelines affect the caption:** If you opt in (toggle) **and** you've saved non-empty voice guidelines, they're injected as a dedicated **"VOICE GUIDELINES"** block placed right after the ghostwriter instruction — governing *how* the caption is written (your phrases, cadence, do's and don'ts) while the breakdown supplies *what* it's about. This applies to both full generation and targeted edits.

**The toggle system:** The "Apply my voice guidelines" checkbox (`VoiceGuidelinesToggle`) is **self-gating** — it fetches your profile and renders nothing unless you actually have saved guidelines. It's off by default (opt-in per generation). It appears on all three flows (caption, image, carousel).

**Custom instruction box:** A textarea ("What should change? e.g. make it shorter, add more stats, make it funnier…"). When you type an instruction and regenerate, the API switches to **targeted-edit mode** — it sends your *current caption* and applies only your instruction with minimum changes (returning nothing but the edited caption + hooks), instead of rewriting from scratch.

**Regeneration:** Gated to **2 regenerations per idea, per browser session** (`MAX_REGENERATIONS = 2`, stored in `sessionStorage`). The current caption is saved to **version history** (up to 3 previous versions, restorable) before each regenerate. A toast warns when you've used them up. Failed regenerations refund the slot. (The *first* generation doesn't count against the limit.)

---

## Feature 4 — Image + Caption Flow

Route: `/generate/image`. A 4-step wizard (`_client.tsx`), all state persisted per-idea to `localStorage` so you can leave and return.

### Step 1 — Caption generation
Same streaming caption engine as Feature 3, with the voice-guidelines toggle and a custom-instruction regenerate box. Continue once the caption is ready.

### Step 2 — Choose ratio
- **4:5 Portrait** (1080×1350) — "Instagram, LinkedIn, Facebook."
- **1:1 Square** (1080×1080) — "Instagram, Twitter/X, Facebook."

### Step 3 — Reference image (optional)
Upload a **style reference** (drag-drop or click). What it does:
- **Client-side compression** (`ReferenceUploader`): the image is downscaled to max 1024px and re-encoded to JPEG at 0.8 quality (to avoid 413 payload errors on large camera photos), stripped of its data-URL prefix.
- **Server-side validation** (`lib/validateImage.ts`): allowlisted types (PNG/JPEG/WEBP), a 5MB decoded-size cap, and a **magic-byte check** so the bytes actually match the declared format — before it ever reaches Claude's vision API.
- The reference defines **visual style only** — technique, palette, typography, lighting — never the subject or any text in it.
- Changing/removing the reference **invalidates** any already-generated image (its style was baked into the prompt) and bounces you back to regenerate.

You can **Skip** (generate without a reference) or **Continue with reference**.

### Step 4 — Image prompt generation (Claude vision)
Silently, `POST /api/generate/image-prompt` calls Claude Sonnet 4.5 (with the reference image attached as a vision input, if provided). Claude:
- **Extracts** only the style from the reference — naming the exact illustration technique, listing 5–8 dominant hex codes (including *distinct shades* of the same color family, never collapsing them), typography treatment, composition ratio, and lighting.
- **Explicitly ignores** the reference's subject and any text in it.
- Writes a **minimum 400-word** image prompt for a 100% original scene built from *this post's* content (refinedHook + deepDive), with hex codes for every color and a final self-check that it's about the post's topic, not the reference. It's told this is a standalone image — no "swipe" cues, no arrows, no next-slide teasers.

### Step 4 (cont.) — Image generation (`gpt-image-2`)
`POST /api/generate/image` sends that prompt to OpenAI **`gpt-image-2`** (`quality: "medium"`, size `1024x1024` or `1024x1280`). Then:
- The returned base64 is **re-encoded with `sharp`** to strip **C2PA / content-credentials metadata** (plus EXIF/XMP/ICC) — this removes the "Made with AI" badge LinkedIn/Instagram/X would otherwise show.
- The clean PNG is uploaded to **Cloudflare R2**, and a `Post` (+ `Slide`) row is saved (`SINGLE_IMAGE`, `READY`).
- If it's your first-ever post, the celebratory **First Post email** ("You just created your first post 🎉") is sent.
- Image generation does **not** cost a credit but is rate-limited to **20/hour** per user (real OpenAI cost).

**Custom instruction box after generation:** An `InstructionBox` appears under the image. Typing an instruction + **Regenerate Image** re-runs the flow in **targeted-edit mode** (edits the existing image prompt with minimum changes, then re-renders). Without an instruction, Regenerate just re-renders from the existing prompt. Regeneration counts against the same 2/session budget.

**Downloading the image:** **Download HD Image** routes through a same-origin proxy (`/api/proxy-image`) to dodge R2 CORS, then saves `carouselabs-image-[ideaId].png` (falls back to opening the image in a new tab).

**Post to LinkedIn button:** Publishes the caption + single image directly. There's also a **Save Draft** button to persist caption edits back to the post.

**Loading game:** While the image generates, the layout splits 70/28 and the precision-timing mini-game (Feature 9) appears on the right — and stays available even after the image loads.

---

## Feature 5 — Carousel Flow

Route: `/generate/carousel` (**Pro-only**, gated at the UI *and* the API). A 4-step wizard, fully persisted per-idea to `localStorage`.

### Step 1 — Caption generation
Same streaming caption engine, with the voice-guidelines toggle and instruction-based regenerate. Continue once ready.

### Step 2 — Choose ratio
- **4:5 Portrait** (1080×1350) — "Best for LinkedIn feed."
- **1:1 Square** (1080×1080) — "Classic format."

### Step 3 — Reference image (optional)
Identical upload/compression/validation to the image flow. Here the reference defines the shared visual system for **all** slides. Changing it invalidates the whole generated carousel.

### Step 4 — Generate carousel
Click **Generate Carousel** → confirm dialog ("This will generate 7–8 slide images. Takes 2–3 minutes…"). Then a single-button flow runs in two phases:

**Phase A — Slide prompts (`POST /api/generate/carousel-prompt`):**
Claude Sonnet 4.5 (`max_tokens: 16000`, reference image attached if provided) builds **7–8 slides** as structured JSON. Each slide's `prompt` is a single-line string internally structured into labeled, `||`-separated segments in a **non-negotiable order**:
`STYLE:` → `CANVAS:` → `BACKGROUND:` → `TYPOGRAPHY:` → `MAIN ILLUSTRATION:` → `VISUAL HIERARCHY:` → `COLOR PALETTE:` → `MOOD:` — each with a required level of detail (exact hex codes for every color, a fully-described original scene per slide, eye-travel order, and a specific emotional target). Minimum 150 words per slide.

Slide roles are engineered:
- **Slide 1 (HOOK)** — the single most scroll-stopping slide, built from the refinedHook.
- **Slides 2…N-1 (BODY)** — each covers exactly **one** key talking point using the actual breakdown content, sharing an identical palette/typography/lighting system, each leaving an open thread to make you swipe.
- **Final slide (CTA)** — uses the `strongEndingLine` as the saveable takeaway, with a resolution/payoff scene and a clear comment/save/share CTA. No @handles anywhere.

The reference-style extraction rules (technique, multiple distinct shades, typography, lighting) mirror the image flow but apply consistently across every slide ("same design system, different scenes"). A very robust 6-strategy parser (direct JSON → brace extraction → fenced blocks → manual key extraction → newline sanitization → per-slide regex recovery) survives escaping errors in long prompts.

**Phase B — Slide-by-slide image generation:**
The client generates images **one slide at a time** (not in parallel, to respect OpenAI rate limits), each via `POST /api/generate/carousel-images` with `gpt-image-2` (`quality: "medium"`). Progress shows live ("Generating slide 3 of 8…") and **each slide image appears in the grid the moment it's ready.** Before hitting the model, the `||`-labeled scaffolding is stripped so gpt-image-2 receives clean prose. Each slide is uploaded to R2. After all slides finish, the full carousel is persisted to the DB as one `CAROUSEL` post (with a child `Slide` per image), and the first-post email fires if applicable.

**Viewing all 7–8 slides:** `CarouselImageGrid` shows every slide in a 2-column grid with a slide-number badge and a color-coded **role badge** (HOOK / BODY / CTA).

**Per-slide regeneration with custom instructions:** Each slide has its own `InstructionBox` and a **Regenerate Slide N** button. Typing an instruction ("make the background darker") and regenerating re-renders just that slide with the instruction layered on top of its prompt. Uses the same 2/session regeneration budget; failures refund the slot; `persist: false` so regenerations don't create junk posts.

**Download options:**
- **Download** per slide → `carouselabs-slide-N.png` (via the CORS proxy).
- **Download All as PDF** → uses `jsPDF` to build a multi-page PDF, one slide per page, each page exactly the image size (edge-to-edge, zero white space) → `carouselabs-carousel-[ideaId].pdf`. This is the recommended path for a true swipeable LinkedIn document.

**Post to LinkedIn (with warning):** Clicking Post to LinkedIn first opens a warning modal: *"⚠️ Heads up — LinkedIn will show these as separate images, not swipeable slides. For the best carousel experience, download the images and upload them manually to LinkedIn as a PDF document."* You choose **Go Back** or **Upload as Images**. Proceeding publishes all slide images as a native multi-image LinkedIn post.

**Loading game:** As with images, once generation starts the layout splits 70/28 with the mini-game on the right, available throughout.

---

## Feature 6 — LinkedIn Integration

**Connecting LinkedIn (Settings → Account):**
- Click **Connect LinkedIn** → `GET /api/linkedin/connect` mints a CSRF `state` token, stores it in a 10-minute httpOnly cookie, and redirects to LinkedIn's consent screen.
- Scopes requested: **`openid profile w_member_social`** (sign-in identity + permission to post on your behalf).
- LinkedIn redirects to `GET /api/linkedin/callback`, which verifies the state, exchanges the code for an access token, fetches your LinkedIn profile (via `/v2/userinfo` OpenID), and upserts a `LinkedInAccount` row (id, token, expiry, name, picture). You're bounced back to Settings with a "connected" banner.

**Posting mechanics (`lib/linkedin.ts`, `POST /api/linkedin/post`):**
- **Caption only (text post)** — publishes a `ugcPost` with `shareMediaCategory: NONE`, visibility PUBLIC.
- **Image + caption (single image)** — registers an upload via the Assets API (`registerUpload`), PUTs the image bytes, and references the returned `digitalmediaAsset` URN in the post. Bytes are re-encoded through `sharp` at the last hop to strip C2PA so no "Made with AI" badge appears.
- **Carousel (multi-image)** — uploads every slide (sequentially) and includes all asset URNs in one `ugcPost`, which LinkedIn renders as a **native multi-image post** (max 8 images enforced). The UI warns beforehand that these appear as separate images, not swipeable slides (use the PDF for that).
- On success you get a **"View post →"** link to the published update.
- Guards: not-connected → nudge to Settings; expired token → "reconnect" prompt.

**Disconnecting LinkedIn:** Settings → Account → **Disconnect** calls `/api/linkedin/disconnect`, removing the connection. Expired connections show a **Reconnect** button.

---

## Feature 7 — Voice Presets

**What they are:** Named, reusable **tone combinations** (e.g. "Founder Story Mode" = Conversational + Bold). A shortcut so you don't re-pick tones every time.

**Where to set them:** **Settings → Voice Presets.**

**Available tones** (the same 5 as onboarding): Professional & Authoritative, Conversational & Relatable, Inspirational & Motivational, Educational & Informative, Bold & Provocative.

**How to use:** Click **Add preset**, name it, select any combination of tones, **Save preset**. Up to **5 presets** (`MAX_VOICE_PRESETS`). Edit or delete inline. Saved optimistically with revert-on-failure, persisted via `PATCH /api/profile`.

**How they affect output:** Your **profile-level tones** are always fed into the idea, breakdown, and caption prompts as the writing voice. Presets are a convenience layer over that tone system, and the caption page's Tone Selector can override the tone for a single generation.

---

## Feature 8 — Voice Guidelines

**What they are:** A free-form, detailed **personal style guide** (targeted at 1000+ words) describing exactly how your captions should sound — your tone, phrases you use, phrases you avoid, how you structure posts, and examples of your best-performing posts pasted in.

**Where to write them:** **Settings → Voice Presets**, bottom section ("Voice Guidelines"). A large textarea with placeholder guidance. Saved via `PATCH /api/profile` (`voiceGuidelines` is a `@db.Text` column; an empty string clears it).

**Word-count system:** A live word counter sits below the box. Under the **1000-word target** it shows a soft amber nudge: *"Add more detail for better results — aim for at least 1,000 words."* There's **no hard maximum and no minimum enforced** — it's guidance, and the more detail you give, the better the AI matches your voice.

**The toggle (opt-in per generation):** Guidelines are **not** applied automatically. On each generation flow (caption/image/carousel) there's an **"Apply my voice guidelines"** checkbox that only appears if you've saved non-empty guidelines. It's off by default; you opt in per generation.

**How they're applied:** When opted in, your guidelines are injected as a dedicated **VOICE GUIDELINES** block in the caption prompt — placed to clearly govern *how* the caption is written (voice/style) while the breakdown supplies the content. Applied to both full generations and targeted edits.

---

## Feature 9 — Loading Game

**What it is:** A precision-timing mini-game (`LoadingGame`) shown beside the image/carousel generation while you wait — because AI image generation can take 1–3 minutes.

**How to play:**
- A number ticks up and down between **0.00 and 5.00**.
- **Round 1:** hit **STOP** to *set a target* value.
- **Match phase:** the number restarts; hit **STOP** to land on the **exact same** value. You get **3 attempts**.
- Win = stopping on the identical value (difference of exactly 0.00).

**What happens when you win:** A celebration ("🎉 You won the most unique prize in the world!") and — behind the scenes — `POST /api/game/winner` fires, emailing the CarouseLabs team (`carouselabs@gmail.com`) the winner's name and email so they can be contacted about their prize.

**Why it exists:** It turns unavoidable AI wait time into a delightful moment, keeps users on the page during multi-minute carousel generation (the game stays available even after generation finishes), and creates a small viral/word-of-mouth hook via the "most unique prize in the world" gimmick.

---

## Feature 10 — History & Pinning

**What gets saved automatically:** As you work an idea, progress is tracked to the `IdeaHistory` table via `trackHistory()` at key milestones (BREAKDOWN → CAPTION/CAPTION_DONE → IMAGE/IMAGE_DONE → CAROUSEL/CAROUSEL_DONE). Generated posts (captions, images, carousels) are saved as `Post` rows with their images in R2. Caption text and per-idea generation state also persist to `localStorage` so any flow restores exactly where you left off ("Restored from last session" badge).

**Accessing past posts (`/history`):** A searchable, filterable list of every idea you've touched. Search by hook keyword; filter tabs: **All / Caption / Image / Carousel**. Each `HistoryCard` shows the idea, its furthest-reached stage (a progress badge), and last-visited time. Sorted pinned-first, then most recently visited.

**Pinning:**
- From the **dashboard idea feed** — pin an idea (`PATCH /api/ideas/[id]/pin`, optimistic).
- From **History** — pin/unpin entries (re-sorts pinned to top).
- **Pinned page (`/pinned`)** — a dedicated view of everything you've pinned.

**Re-using past content:** From History you can **Duplicate** an idea (`/api/ideas/[id]/duplicate`) to spin off a fresh copy, **Delete** a history entry, or just click through to `/idea/[id]` to continue — the breakdown is cached (free) and your generation state restores.

---

## Feature 11 — Credits System

**Free plan:** `FREE_LIFETIME_POSTS = 1`. Exactly **one lifetime breakdown**, consumed atomically (concurrency-safe so it can't be double-spent). Free users can use **Caption Only** and **Image + Caption**, but **not carousels** (Pro-only, blocked at UI and API).

**Pro plan:** `MONTHLY_CREDITS = 30` per month. Spending order: monthly allowance first, then any valid (non-expired) **extra credits**.

**What costs 1 credit:** Generating a **new breakdown** — from a picked idea (`/api/ideas/[id]/breakdown`) or the My Own Idea flow (`/api/my-idea/generate`). **Nothing else costs a credit:** captions, images, carousel slides, and all regenerations are free (image generation is instead protected by a 20/hour rate limit for cost). Cached breakdowns are free.

**Credit emails (Pro only, best-effort):**
- **5 remaining** → "You have 5 credits left this month ⚠️" (`CreditsLowEmail`).
- **0 remaining** → "You've used all your credits for this month 🔴" (`CreditsExhaustedEmail`).
- **Monthly reset** (on successful renewal payment) → "Your 30 credits have been reset 🔄" (`MonthlyResetEmail`).
- **Extra credits purchased** → "Your extra credits are ready! ✅" (`ExtraCreditsEmail`).

(These monthly-allowance emails only fire for Pro users; a Free user simply hits 0 on their single lifetime post.)

**Where credits are shown:** Settings → Billing shows "Credits remaining" (with `/ 30 (+N extra)` for Pro), turning amber at ≤5 with an inline warning.

---

## Feature 12 — Billing

**Free vs Pro comparison:** See Section 1. Free = $0, 1 lifetime post, no carousels. Pro = $24/month, 30 monthly credits, carousels + PDF export + priority support.

**Checkout flow (Lemon Squeezy):** Settings → Billing → **Upgrade to Pro** uses a `LemonSqueezyButton` (pre-filled with your email) to open Lemon Squeezy checkout. On successful purchase, the **`/api/webhooks/lemonsqueezy`** endpoint (HMAC-SHA256 signature-verified, idempotent via a `ProcessedWebhookEvent` table so redeliveries can't double-grant) handles:
- **`subscription_created`** → set plan PRO, status ACTIVE, reset credits to 30, store LS ids + renewal date, send "Welcome to Pro! You have 30 credits ready 🚀."
- **`subscription_payment_success`** (monthly renewal) → reset credits to 30, update renewal date, send the reset email.
- **`subscription_updated`** → sync status/renewal.
- **`subscription_cancelled`** → set `cancelAtPeriodEnd`, keep Pro until period end, send cancellation email.
- **`subscription_payment_failed`** → mark PAST_DUE.

**Subscription management:** Settings → Billing shows current plan, credits, and next-renewal (or "Access ends") date.

**Cancellation:** A **Cancel Subscription** button (`/api/billing/cancel-subscription`, using the Lemon Squeezy SDK) cancels **at period end** — you keep Pro access until `currentPeriodEnd`, after which it lapses. Once cancellation is set, the page shows "Your subscription is set to cancel at the end of the current period." A **renewal-reminder cron** (`/api/cron/renewal-reminder`, daily, secret-gated) emails Pro users ~3 days before renewal ("Your Pro subscription renews in 3 days").

---

## Feature 13 — Settings (all sections)

Settings is tabbed (`SettingsTabs`): **Profile · Voice Presets · Account · Billing.**

### Profile (`/settings/profile`)
Edits the exact same fields onboarding captured, so idea/caption quality can be tuned anytime:
- **Identity** — role (7 options).
- **Industry & Niche** — searchable industry + "describe your business" (max 500 words).
- **Content Topics** — 3–7 tags (type or pick from suggestions).
- **Target Audience** — job role (max 5 words), seniority, industry (max 5 words), core problem (max 200 words).
- **Content Goals** — multi-select + primary.
- **Tone & Voice** — any combination of the 5 tones.
Word limits are enforced live by `WordLimitedField`. Save requires the required fields; saving clears the cached idea suggestions so the dashboard regenerates fresh ones. "Applies to your next idea generation."

### Voice Presets (`/settings/voice-presets`)
Manage up to 5 named tone presets **and** the free-form Voice Guidelines textarea (with the 1000-word soft target). See Features 7 & 8.

### Account (`/settings/account`)
- **Account info** — email + plan badge.
- **LinkedIn** — connect / reconnect / disconnect (Feature 6), with status and success/error banners.
- **Your data → Export my data** — `GET /api/account/export` downloads all your ideas and posts as `carouselabs-export-[date].json`.
- **Delete account** — `POST /api/account/delete` performs a **soft delete** (sets `deletedAt`; data retained but the user is treated as deleted app-wide).

### Billing (`/settings/billing`)
Plan & credits, upgrade (Lemon Squeezy) or manage/cancel subscription, renewal date, low-credit warnings. See Feature 12.

---

# SECTION 4 — AI MODELS USED

## Claude Sonnet 4.5 (`claude-sonnet-4-5`) — all the thinking & writing

Powers every text/reasoning task:
- **Idea generation** — the 10-ideas batch (grounded in NewsAPI headlines), `max_tokens: 2000`, no tools.
- **Idea suggestions** — the dashboard's personalized "what to post about" prompts.
- **Breakdowns / deep dives** — the 600–800 word content build, `max_tokens: 3000`, no tools.
- **My Own Idea deep dives** — 1100+ words, **`max_tokens: 8000` with the `web_search` tool** for real, current facts (with a pause-turn resume loop).
- **Captions** — streamed ghostwriting, `max_tokens: 3000`, plus targeted-edit mode.
- **Image prompts** — vision-enabled (`max_tokens: 4096`): reads the reference image, extracts its style, writes a 400+ word original prompt.
- **Carousel prompts** — vision-enabled, `max_tokens: 16000`: structured 7–8 slide JSON with the STYLE/CANVAS/BACKGROUND/… segment schema.

Claude's vision capability is the backbone of the "match the style, don't copy the image" behavior — it identifies exact hex codes (including distinct shades), technique, typography, and lighting from a reference and reapplies them to original scenes.

## OpenAI `gpt-image-2` — all the imagery

Powers every pixel:
- **Single images** (Image + Caption flow) — `quality: "medium"`, size `1024x1024` (1:1) or `1024x1280` (4:5).
- **Carousel slide images** — same model/quality/sizes, generated **one slide at a time** for live progress and to respect rate limits.

Post-processing: every generated image is re-encoded through **`sharp`** to strip C2PA/content-credentials + EXIF/XMP/ICC metadata (removing the "Made with AI" badge), then stored on Cloudflare R2. Image generation is rate-limited to 20/hour/user (cost control) and does not consume content credits.

---

# SECTION 5 — CONTENT OUTPUT QUALITY

## What makes CarouseLabs captions different from generic AI writing

- **Built from a deep dive, not a one-liner.** Captions are ghostwritten from a 600–800 word (or 1100+ word) fully-built breakdown, so they carry real substance and specifics — not a thin paraphrase of a prompt.
- **A real ghostwriting system, not "write a LinkedIn post."** The prompt encodes concrete craft rules: a scroll-stopping first line, never opening with "I", the "but then…" flip, short punchy paragraphs, generous white space, a "wait, I never thought of that" beat, and a discussion-inviting closing question — targeting the 1500–2500 character sweet spot with 7–8 hashtags.
- **Grounded in reality.** Idea generation uses real 48-hour NewsAPI headlines and the My Own Idea flow uses live web search — with explicit instructions to never fabricate news, funding numbers, names, or stats.
- **Anti-repetition.** Every batch varies hook style, angle, and sub-topic via built-in rules and a random seed.

## How the voice system personalizes output

Three layers, increasingly specific:
1. **Profile tones** (always on) — your selected tones feed every writing prompt.
2. **Voice presets** — reusable named tone combos + a per-generation tone override.
3. **Voice guidelines** (opt-in) — your 1000+ word personal style guide injected as a governing VOICE-GUIDELINES block, teaching the model your exact phrases, cadence, and do's/don'ts.

## How reference-image matching works

The reference is treated strictly as a **style guide, never content**. Claude vision extracts:
- **Illustration technique** (named precisely: watercolor+ink, flat vector, 3D render, etc.).
- **Palette** — 5–8 exact hex codes, including **every distinct shade** of a color family (a light blue and a dark blue are captured separately, never merged or lightened to white).
- **Typography treatment, composition ratio, and lighting logic.**

It then **explicitly ignores** the reference's subject and any text, and depicts a 100% original scene from *your* post's content in that style — with a final self-check to rewrite if the prompt drifted toward recreating the reference. For carousels, that single extracted system is applied identically across all 7–8 slides so the deck looks like one cohesive design.

## What a typical carousel looks like end to end

1. You pick an idea → a deep dive is built (refinedHook, deepDive, ~5 talking points, strong ending line).
2. A caption streams in, in your voice.
3. You choose 4:5 or 1:1 and (optionally) upload a style reference.
4. Claude designs 7–8 slides: a **HOOK** slide engineered to stop the scroll, **BODY** slides each covering one real talking point in an identical palette/type/lighting system with swipe-forward tension, and a **CTA** slide using your strong ending line with a payoff scene and a clear ask.
5. gpt-image-2 renders each slide one-by-one, appearing live in the grid.
6. You regenerate any slide with a custom instruction, then **Download All as PDF** (a true swipeable deck) or post the images to LinkedIn.

The result is a premium, on-brand, content-rich carousel produced in 2–3 minutes from a single idea.

---

# SECTION 6 — KEY DIFFERENTIATORS vs COMPETITORS

> Competitor prices below reflect the market positioning CarouseLabs targets; feature comparisons are based on what CarouseLabs actually ships.

**vs Taplio (~$65/month):** Taplio is a strong LinkedIn scheduling + inspiration tool, but at roughly 2.7× the price. CarouseLabs delivers the end-to-end idea → deep-dive → caption → **image → carousel → publish** pipeline (including AI-generated visuals and carousels) at **$24/month**, with reference-image style matching Taplio doesn't offer.

**vs Supergrow (~$19/month):** Supergrow focuses on text/carousel post writing and templates. CarouseLabs goes further with **true AI image generation** (`gpt-image-2`), **reference-style extraction**, **news-grounded ideas** (real NewsAPI headlines + live web search), and **direct LinkedIn publishing** — a full studio rather than a writing assistant.

**vs Canva (manual design):** Canva is all-manual — you design every slide yourself. CarouseLabs **auto-designs** a cohesive 7–8 slide carousel from your post content and an optional reference, generating original illustrations per slide with a consistent palette/typography/lighting system, then exports a print-ready PDF. No dragging, no templates to fill.

**vs ChatGPT (no images, no carousels, no LinkedIn posting):** ChatGPT can help draft a caption, but it doesn't know your saved voice/profile, doesn't ground ideas in real 48-hour news by default, doesn't produce ready-to-post branded **carousel decks**, doesn't match a **reference image's** exact palette across slides, and can't **publish to LinkedIn**. CarouseLabs is a purpose-built workflow, not a blank chat box.

**What CarouseLabs does that none of them do (together):**
- One flow from **news-grounded idea → deep-dive → voiced caption → AI image → full carousel → one-click LinkedIn publish.**
- **Reference-image style extraction** (exact hex shades, technique, typography, lighting) applied consistently across an entire carousel — depicting original scenes, not copies.
- **C2PA metadata stripping** so posted images don't carry a "Made with AI" badge.
- A **1000-word Voice Guidelines** system for genuinely personalized ghostwriting.
- Delight touches like the **precision-timing loading game** with a real prize.

---

# SECTION 7 — TECHNICAL STACK

Plain-English version of what's under the hood.

- **Frontend:** Next.js (App Router) with TypeScript and Tailwind CSS. Interactive state uses Zustand stores; animations use Framer Motion. (Note: this build ships a customized Next.js with its own conventions — see `AGENTS.md`.)
- **Backend:** Next.js API routes (`app/api/**`) — serverless handlers for ideas, breakdowns, generation, LinkedIn, billing, webhooks, and account actions.
- **Database:** Supabase (PostgreSQL) accessed through **Prisma**. Core tables: `User`, `Profile`, `Idea`, `Breakdown`, `Post`, `Slide`, `IdeaHistory`, `Subscription`, `LinkedInAccount`, `UsageCounter`, `ProcessedWebhookEvent`.
- **AI:** **Anthropic Claude Sonnet 4.5** (ideas, breakdowns, captions, image prompts, carousel prompts; web search for "My Own Idea") + **OpenAI `gpt-image-2`** (all images and carousel slides).
- **Image storage:** **Cloudflare R2** (all generated images/slides), served via a same-origin proxy to avoid CORS on download/PDF export. `sharp` strips AI-content metadata before storage/upload.
- **Payments:** **Lemon Squeezy** — hosted checkout, signature-verified idempotent webhooks, cancel-at-period-end.
- **Email:** **Resend** with React Email templates (welcome, onboarding complete, first post, upgraded to Pro, credits low/exhausted, extra credits, monthly reset, renewal reminder, cancellation, game-winner).
- **Auth:** **Clerk** (email/password + Google OAuth), with a webhook that provisions user/subscription/usage rows and self-healing fallback.
- **Rate limiting:** **Upstash Redis** (`@upstash/ratelimit`) — 10 idea generations/hour, 20 image generations/hour, per user.
- **News:** **NewsAPI.org** for real 48-hour headlines grounding the Latest News ideas.
- **Hosting:** **Vercel** (long-running generation routes get `maxDuration = 300`; a daily Vercel Cron drives the renewal-reminder email).

---

*This guide reflects the CarouseLabs codebase as implemented — routes under `app/`, prompts under `lib/ai/prompts/`, components under `components/`, and the Prisma schema under `prisma/`.*
