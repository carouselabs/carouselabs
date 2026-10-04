# Billing, credits and scheduled publishing verification

Verified locally on 2026-09-30 on Windows/PowerShell, Node 24.16.0, npm 11.13.0. These are application tests with mocked database/provider boundaries, not evidence of live Postgres isolation or live billing/LinkedIn behavior.

## Implemented changes reviewed

- **High: concurrent credit spending and incorrect refunds.** `lib/credits.ts` compares the full billing snapshot before debiting allowance and extras together. Failure handlers receive a server-created receipt and restore the exact pools, avoiding duplicate request-local refunds and debits against a renewed allowance. Generation routes use the receipt. Production extension quota enforcement cannot be disabled by a development environment flag.
- **High: checkout identity and allowance manipulation.** The new authenticated `app/api/billing/checkout/route.ts`, `lib/billingIdentity.ts`, checkout buttons and extension checkout attach a server HMAC for the authenticated account and configured variant. Webhooks do not trust an editable checkout email or an unsigned arbitrary account ID. Top-up credits derive from the paid USD amount after discounts. Existing paid subscriptions go to management rather than a second checkout.
- **High: webhook replay and partial financial updates.** `app/api/webhooks/lemonsqueezy/route.ts` commits the event ledger and financial changes together in a serializable transaction; database failures return 503 for provider retry. Notifications follow commit. Unknown products fail closed; stored subscription mappings handle invoices without variant IDs, initial and historical invoices do not reset allowances twice, and a late historical invoice cannot restore an expired plan. Extension fixtures now model signed metadata and transaction rollback rather than the old unsafe fallback.
- **High: duplicate scheduled publication after a timeout or process crash.** `app/api/cron/publish-scheduled-posts/route.ts`, `lib/linkedin.ts`, and `lib/scheduledPostState.ts` quarantine uncertain outcomes for manual reconciliation. No automatic retry follows possible publication or a confirmed publication whose database finalization failed. Confirmed preparation failures receive at most three total attempts. Atomic claims include the schedule revision; recurring content reservation is serializable with at most three serialization-conflict attempts. A run stops claiming new work after 150 seconds to leave room for the bounded provider operation.
- **High: suspended/deleted accounts could publish through the cron.** Recurring and due queries, content reservation and atomic claims now require `deletedAt: null` and `suspendedAt: null`; defensive snapshot checks also skip inactive accounts. Already dispatched external operations cannot be recalled by this check.
- Schedule edits/deletes enforce ownership, compare revisions, block in-flight mutation and require explicit confirmation before requeueing uncertain publication. Notification errors log their error class rather than provider bodies.

## Commands actually run

| Command (from repository root unless specified) | Result |
| --- | --- |
| `npm test -- tests/credit-accounting.test.ts tests/billing-webhook.test.ts tests/billing-checkout.test.ts tests/extension-checkout.test.ts` | PASS: 4 files, 44 tests; 4.48 seconds |
| `npm test -- tests/scheduler-reliability.test.ts` | PASS: 1 file, 14 tests; 1.26 seconds |
| `npm run test:unit` in `browser-extension-comment` | PASS: 25 files, 258 tests; 43.62 seconds, including existing rebranding/streaming work |
| `npm run build` in `browser-extension-comment` | PASS: TypeScript project build and Vite 6.4.3 production bundle; Vite build 35.53 seconds |
| `npm audit --audit-level=high --json` in `browser-extension-comment` | PASS: 0 reported vulnerabilities, 366 dependencies |

The extension unit command first failed before loading tests because the sandbox denied esbuild access to parent package metadata. The approved local retry passed. Build/audit retries were approved; no live service calls were made by tests. The root test runner reports an advisory about its ESM configuration being loaded as CommonJS under a future Vite default; it does not fail these tests. Logs are ignored local files: `audit-billing-final-tests.log`, `audit-scheduler-final-tests.log`, `audit-extension-final-tests.log`, `audit-extension-final-build.log`, and `audit-extension-final-dependencies.json`.

Scheduler tests cover unauthorized cron access, stale-worker quarantine, competing claims, deleted/suspended accounts, ambiguous provider timeout, bounded safe retry, database failure after confirmed publication, recurring serialization-conflict retry, redacted failed notification, cross-account mutation, in-flight mutation and explicit reconciliation. Mocked concurrency checks establish the application's guards; they do not prove actual database transaction isolation.

## Release risks and required staging checks

- **Credit crash recovery remains unresolved:** receipts are request scoped. Process termination after debit, or a failed refund, needs operator reconciliation. No durable operation ledger/outbox was added. Do not claim end-to-end exactly-once paid generation or guaranteed refund recovery.
- No isolated real database, Clerk A/B accounts, Redis, R2, Lemon Squeezy test-mode store or LinkedIn test identity was exercised. Stage quota races, rollbacks, payment signature failures, duplicate/out-of-order webhooks, renewal, top-ups, cancellation, expired sessions and two-account access before release.
- Existing unsigned checkout links no longer safely bind a first subscription. Regenerate checkout links after deployment; reconcile previously opened or pending legacy checkouts explicitly. Never restore email-only assignment as a workaround. Verify configured checkout URLs really point to their configured variant IDs and webhook secrets agree with the store.
- No durable outbox for post-commit emails was introduced. A process crash after financial commit may lose a notification even though the financial event is recorded.
- No exhaustive ordering ledger was added for every subscription lifecycle event. Test delayed cancel/resume/update events and resubscriptions in staging; review events requiring manual reconciliation.
- Scheduled publication intentionally leaves ambiguous outcomes blocked. Operators/users must inspect LinkedIn before confirming a retry. Preserve any confirmed publication URL; never mass-reset failed/publishing rows. A restored account's previously queued work may become eligible again, so review schedules when reactivating accounts.
- Direct one-click LinkedIn publishing still lacks a durable idempotency key/reconciliation workflow. Do not automatically retry it after an ambiguous response. Recurrence DST behavior and concurrent creation through every manual scheduling path are not exhaustively verified.

## Rollout and rollback

No database migration or production mutation was performed for these changes. Apply the repository's existing migration process only after inspecting the target schema in staging. Deploy checkout generation and webhook verification together. Confirm production has the required variant IDs, webhook secret and checkout URLs; configure cron authentication through `CRON_SECRET`. Verify the known processed-webhook table and existing uniqueness constraints are present before handling test payments.

Roll back code and dependency lockfiles as one previous release artifact if needed. Do not erase or rewind credit balances, processed webhook records, subscription mappings or publication reconciliation state. A rollback to prior code reintroduces the corrected risks; pause affected production workflows through the normal operator process if safe rollback requires that. No production deployment, live payment, AI generation, email send, LinkedIn post or credential rotation was performed during this verification.

## Extension recheck on 2026-10-01

Following additional user extension UI, component, and test changes, the current extension was rechecked without modifying source:

- `npm run test:unit` in `browser-extension-comment`: **PASS, 32 files / 322 tests**, 61.63 seconds.
- `npm run build` in `browser-extension-comment`: **PASS**, TypeScript project build and Vite 6.4.3 production build (Vite phase 8.81 seconds; 1,708 modules). Main sidepanel JS 379.24 kB / 116.91 kB gzip.
- Both initial sandbox attempts failed during config loading because esbuild could not read parent-directory metadata. Approved local retries completed successfully. This is an environment startup limitation, not a failed application test.
- The extension package lock has no working-tree changes; the earlier audit result of 0 vulnerabilities across 366 dependencies was not rerun. No current extension browser E2E, live browser store, or third-party integration result is inferred from these unit/build checks.

Logs: `audit-final-extension-unit.log` and `audit-final-extension-build.log` (ignored local artifacts). Tests and build ran concurrently; these durations are verification timings, not a comparative performance benchmark. Existing user changes were preserved.
