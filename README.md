# Carousel Labs

Next.js App Router application for generating, editing, saving and scheduling social content, with Clerk authentication, PostgreSQL/Prisma persistence, Cloudflare R2 media, and Lemon Squeezy billing. The Engage browser extension has its own package and tests in `browser-extension-comment/`.

## Local setup

Validated with Node 24.16.0 and npm 11.13.0 on Windows. Use the committed npm lockfiles.

1. Run `npm ci` at the repository root.
2. Copy `.env.example` to `.env.local` and configure isolated development services. Do not overwrite an existing environment file. Prisma CLI also reads `.env`; supply `DATABASE_URL` and `DIRECT_URL` in your shell or a local ignored `.env` for database commands.
3. Run `npx prisma generate`. This generates the client; it does not change the database.
4. Have the database owner provision an isolated database matching `prisma/schema.prisma` and review `prisma/migrations_manual/` plus the Engage/X SQL in `scripts/` (see the main integration note below). This repository does not have a complete Prisma migration history. Do not run `db push`, resets, or seeds against a live database as part of setup.
5. Run `npm run dev` and open http://localhost:3000. Use the hostname registered with Clerk; switching between localhost and 127.0.0.1 can break its redirect/proxy handling.

Authentication and protected journeys require working development Clerk and database configuration. AI, storage, billing, email, Redis limits, and LinkedIn publishing need their respective service configuration. A local environment file can contain live credentials: use test services before exercising those operations. The automated unit tests mock these boundaries; public browser tests block third-party requests.

## Verification

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

## Deployment and audit

See [the main integration note](docs/MAIN-INTEGRATION-2026-10-04.md) for combined-branch checks and extension update instructions.

See [the audit and verification report](docs/AUDIT-2026-09-30.md) for findings, measured performance, limitations, required staging checks, and rollback instructions. No deployment or live data changes were performed by the audit. Resolve its release blockers before treating this branch as ready for production.

Deploy as a Node.js/Next.js application (the repository includes Vercel cron configuration), not a static export. Configure environment variables in the deployment secret store. Keep secrets out of NEXT_PUBLIC variables, source control, screenshots and logs. The example values are placeholders, not usable credentials.
