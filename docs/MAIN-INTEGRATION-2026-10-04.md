# Main integration ? 4 October 2026

The audit checkpoint is commit `9491aeb` on `audit/reliability-security-2026-09-28`. It was merged into a new local `main` starting at `d128d2c`. The existing `master` branch and the separate Engage-admin checkout were preserved. Remote main advanced during integration; the final history also needs to include `451eb1e` (separate X billing and website promotion). No push, deployment, store publication, database modification or live-provider test was performed by this integration.

## Merge decisions

- Preserve main's newer LinkedIn/X clients, Stop/timeouts, profile rewrite, direct Insert, Engage admin controls and generation engine.
- Retain audit authentication/ownership protections, signed checkout, credit handling, save recovery, scheduler safeguards, bounded image fetching, browser headers, performance changes and regression tests.
- Preserve intentional removal of the obsolete InsertWarningModal and retain newer feature assertions in extension tests.
- Generate the Prisma client for the combined schema; this does not apply SQL or contact the database.
- Include both LinkedIn and X production builds in CI; exclude their generated output from source linting.
- Leave unrelated local `.claude/` settings uncommitted.

## Verification

Final combined-branch verification is in progress. Historical audit measurements below are not measurements of the later X/Engage commits. Results will be completed before the final local commit.

## Updating the extension locally

Both extensions use `browser-extension-comment/`:

```powershell
npm run build --prefix browser-extension-comment
npm run build:x --prefix browser-extension-comment
```

Open `chrome://extensions`, reload the existing unpacked extension, or enable Developer mode and choose Load unpacked. Select `browser-extension-comment/dist` for LinkedIn or `browser-extension-comment/dist-x` for X. Refresh the LinkedIn/X tabs afterward. Production builds default to `https://carouselabs.com`; a saved developer API URL override must be cleared or corrected if present. Local code changes to the website API require a separately configured local/staging connection or an approved deployment before an extension pointed at production can use them.

A Git commit does not update an installed extension or a Chrome Web Store listing. Store release requires its own reviewed production package and a version higher than the currently published version (not checked here). Current source version is 1.3.0. Do not upload a development build.

## Deployment prerequisites and rollback

The original [audit report](AUDIT-2026-09-30.md) and [dependency notes](audit-dependency-notes.md) still apply. The unresolved high braces advisory leaves the dependency CI gates failing. Real Clerk A/B access, provider billing/webhooks, PostgreSQL concurrency, storage privacy and durable paid-operation recovery remain unverified or unresolved. No production-readiness claim is made.

The audit itself introduced no database migration. Newer main already contains additional Engage/X schema requirements. Before any approved deployment, the database owner must compare the actual schema with `prisma/schema.prisma` and review `scripts/engage-admin-schema.sql`, `scripts/engage-admin-phase-b.sql`, `scripts/engage-admin-phase-c.sql`, `scripts/x-extension-schema.sql` and, for separate X billing, `scripts/x-billing.sql`. Their presence is not evidence they were applied. The repository does not have a complete Prisma migration history. Do not run resets/seeds or destructive rollback SQL as part of routine setup.

Review the final diff and run staging verification before authorizing a push that triggers production or an explicit deployment. Configure the required variables from `.env.example`; separate X billing configuration must match the configured provider variant and checkout URL. Keep the previous reviewed deployment artifact for rollback. A Git merge can be reverted with its first parent as the mainline after checking the exact commit and subsequent changes; do not reset shared branches or force-push. Do not execute the SQL rollback files automatically: they drop tables/columns and can lose data. Code rollback does not reverse charges, webhook processing or published posts; reconcile those separately.
