# Anant Goyal

I build AI products end to end: the idea, the design, the code, the tests and the launch. This account holds my main product, **CarouseLabs**, and my other work.

[carouselabs.com](https://carouselabs.com) · [anantgoyal.in](https://anantgoyal.in) · [LinkedIn](https://www.linkedin.com/in/anantgoyal45/) · hello@anantgoyal.in

## Projects

| Project | What it is | Live | Code |
| --- | --- | --- | --- |
| **CarouseLabs** | AI social media studio: captions, images and carousels, scheduling and LinkedIn publishing | [carouselabs.com](https://carouselabs.com) | this repository |
| **CarouseLabs Engage for LinkedIn** | Chrome extension that writes comments, replies, connection notes and messages in your own voice, and puts them into LinkedIn for you to post | [Chrome Web Store](https://chromewebstore.google.com/detail/carouselabs-engage/jgbmpekpdlckkeeffbamcbcnfodamnia) | [`browser-extension-comment/`](browser-extension-comment) |
| **CarouseLabs Engage for X** | The same for X: replies and direct messages | [Chrome Web Store](https://chromewebstore.google.com/detail/carouselabs-engage-for-x/ehijoiaapdlimkmkoejijammmiahcfbo) | [`browser-extension-comment/`](browser-extension-comment) |
| **Mini AI** | A voice-first Key Account Manager for marketplace sellers: talks with a seller, finds why their sales dropped and recommends what to do (Snapdeal *AI First Intern* assignment) | [miniai.anantgoyal.in](https://miniai.anantgoyal.in) | [mini-ai-voice-kam](https://github.com/carouselabs/mini-ai-voice-kam) |
| **anantgoyal.in** | My email design and outreach portfolio, with hand-built, table-based HTML emails | [anantgoyal.in](https://anantgoyal.in) | [anantgoyal.in](https://github.com/carouselabs/anantgoyal.in) |

## Inside CarouseLabs

- **Content studio.** AI captions, images and carousels, with 48 visual looks to pick from and the creator's own call to action drawn into the image. Posts are scheduled and published to LinkedIn.
- **Engage, three Chrome extensions from one codebase** (LinkedIn, X, and Reddit in progress). Comments stream in as they are written, in voices people set up themselves. Engage reads the pictures in a post and watches its video (stills plus a transcript of the speech), keeps the comments people reuse, and works inside Sales Navigator and LinkedIn's newer page design. Custom AI agents handle direct messages. People review and post every comment themselves.
- **Growth and email.** Email campaigns with an AI email writer, open and click tracking, lead lists (CSV import, Brevo sync), ready-made emails, and a check of where an email lands: Primary, Promotions or Spam.
- **Admin.** A control center for Engage: switch features off for everyone or one person, set per-person prices and offers, and follow AI cost and the errors the extensions report.
- **Intern portal** at employee.carouselabs.com: onboarding, attendance and reports.
- **Quality.** Over 2,000 automated tests (Vitest), plus Playwright tests that load the real extension in Chromium against copies of LinkedIn's pages.

## Built with

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 · Prisma and PostgreSQL (Supabase) · Clerk · Upstash Redis · Cloudflare R2 · Lemon Squeezy · Resend and Brevo · OpenAI and Anthropic models · Vite and CRXJS for the Chrome extensions (Manifest V3) · Vitest and Playwright · Vercel

---

## Developer guide

Next.js App Router application for generating, editing, saving and scheduling social content, with Clerk authentication, PostgreSQL/Prisma persistence, Cloudflare R2 media, and Lemon Squeezy billing. The Engage browser extension has its own package and tests in `browser-extension-comment/`.

### Local setup

Validated with Node 24.16.0 and npm 11.13.0 on Windows. Use the committed npm lockfiles.

1. Run `npm ci` at the repository root.
2. Copy `.env.example` to `.env.local` and configure isolated development services. Do not overwrite an existing environment file. Prisma CLI also reads `.env`; supply `DATABASE_URL` and `DIRECT_URL` in your shell or a local ignored `.env` for database commands.
3. Run `npx prisma generate`. This generates the client; it does not change the database.
4. Have the database owner provision an isolated database matching `prisma/schema.prisma` and review `prisma/migrations_manual/` plus the Engage/X SQL in `scripts/` (see the main integration note below). This repository does not have a complete Prisma migration history. Do not run `db push`, resets, or seeds against a live database as part of setup.
5. Run `npm run dev` and open http://localhost:3000. Use the hostname registered with Clerk; switching between localhost and 127.0.0.1 can break its redirect/proxy handling.

Authentication and protected journeys require working development Clerk and database configuration. AI, storage, billing, email, Redis limits, and LinkedIn publishing need their respective service configuration. A local environment file can contain live credentials: use test services before exercising those operations. The automated unit tests mock these boundaries; public browser tests block third-party requests.

### Verification

`npm run check` runs lint, TypeScript and root Vitest tests. `npm audit --audit-level=high` checks current registry advisories. Lint warnings remain documented in the audit; errors are not suppressed.

Build and browser regression commands (PowerShell):

```powershell
$env:NEXT_BUILD_DIR='.next-audit'
npm run build
npm run start -- --hostname localhost --port 3102
# In another terminal:
npx playwright install chromium
npm run test:e2e
$env:AUDIT_ORIGIN='http://localhost:3102'
node scripts/audit-browser.mjs after
node scripts/audit-interactions.mjs after
node scripts/audit-secrets.mjs
```

Keep the production server running during browser tests. NEXT_BUILD_DIR is optional and must be the same for build and start. The measurement scripts and Playwright config reject non-localhost targets. Their output is ignored under `audit-artifacts/`, `test-results/` and `playwright-report/`. Performance runs should run alone, with no build/test suite in parallel.

Extension checks:

```sh
npm ci --prefix browser-extension-comment
npm run test:unit --prefix browser-extension-comment
npm run build --prefix browser-extension-comment
npm run build:x --prefix browser-extension-comment
```

The LinkedIn and X production outputs are `browser-extension-comment/dist` and `browser-extension-comment/dist-x`. Reload the corresponding unpacked extension in `chrome://extensions`, then refresh LinkedIn/X tabs. A Git commit does not update an installed extension or publish a store release.

The extension's browser tests require its separate Playwright/Chromium setup; see its README. The root CI workflow runs lint, types, both unit suites, dependency audit, production build and the public browser regressions with placeholder integration credentials. Passing CI is not verification of live auth, payments or storage.

### Deployment and audit

See [the main integration note](docs/MAIN-INTEGRATION-2026-10-04.md) for combined-branch checks and extension update instructions.

See [the audit and verification report](docs/AUDIT-2026-09-30.md) for findings, measured performance, limitations, required staging checks, and rollback instructions. No deployment or live data changes were performed by the audit. Resolve its release blockers before treating this branch as ready for production.

Deploy as a Node.js/Next.js application (the repository includes Vercel cron configuration), not a static export. Configure environment variables in the deployment secret store. Keep secrets out of NEXT_PUBLIC variables, source control, screenshots and logs. The example values are placeholders, not usable credentials.
