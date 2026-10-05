# Security verification notes - 2026-09-30

Focused source review and local regression record for the security changes in the audit working tree. This is not a penetration test, ASVS certification, or verification of production configuration. No live accounts, production writes, email deliveries, or remote network probes were used for this pass.

## Verified fixes and evidence

Severity describes the original condition qualitatively, not a CVSS score.

| Severity | Finding and files | Repository resolution and evidence |
| --- | --- | --- |
| High | Email-based account reassignment; stale email values influencing admin access. lib/auth.ts, lib/adminAuth.ts, app/api/webhooks/clerk/route.ts. | Bootstrap/webhook require verified primary email and never replace another account's Clerk ID. Admin also checks current verified Clerk identity. Tests cover collisions, mismatched identities, stale admin email, unverified email, duplicate webhook delivery and competing inserts. User diagnostic logging was preserved with identifying values removed. |
| High | Incomplete DNS/redirect boundary on server-fetched images. lib/safeRemoteImage.ts, lib/externalImage.ts, lib/linkedin.ts, app/api/proxy-image/route.ts. | Shared transport rejects private/reserved IPv4 and non-global IPv6, checks every redirect and pins the socket to approved DNS. Limits: 10 seconds total, four request hops maximum and streamed byte caps. Proxy requires authentication and configured R2 origin, including redirects. Mock transport tests cover metadata redirects, alternative IP forms, mixed DNS, timeout, oversized streams and connection pinning. |
| High | Intern ownership based on mutable email. lib/internAuth.ts, intern routes/page. | Stable Clerk binding is authoritative. Initial verified-email invitation claim conditionally updates an unclaimed invitation. Tests cover another bound identity, simultaneous first visits, invitation reassignment and expired verification. This is not an actual PostgreSQL race test. |
| Medium | Deleted/suspended users reaching direct-session and extension-token paths. lib/extensionAuth.ts, lib/extensionCommentAuth.ts, account/LinkedIn routes. | Reviewed paths check active account before private reads, provider calls and writes. Tests cover disabled users and expired sessions; disconnect is scoped to resolved owner. Intern leaderboard requires active membership or verified admin. |
| Medium | Concurrent leave requests could inconsistently consume allowance or separate attendance from leave. lib/internLeave.ts and leave route. | Ownership/status, balance and both records share a serializable transaction. Only known rolled-back serialization conflicts retry, at most three attempts; ambiguous outcomes require refreshing history. Tests cover duplicates, exhausted allowance after conflict, lost ownership and retry bounds. Actual DB isolation remains unverified. |
| Medium | Weak contact runtime input/resource validation and fail-open Redis timeout. app/api/contact/route.ts. | Body capped at 64 KiB and 10 seconds; types/lengths/email/header checks and HTML escaping. Redis timeout/outage fails closed. Tests cover malformed shapes, false Content-Length, stalled stream, field bounds, denied limits and generic provider errors. Success follows provider acceptance; ambiguous delivery failures are not retried. |
| Medium | Missing consistent cross-site mutation guard and incomplete browser/private-cache controls. lib/requestSecurity.ts, proxy.ts, next.config.ts. | Rejects cross-origin browser writes and cross-site requests without Origin. Webhook/cron and bearer clients retain independent authentication. Tests cover malicious/null origins and webhook lookalikes. API defaults to private/no-store; frame, MIME and base/object CSP controls added. Browser verification belongs to aggregate report. |
| Low | Raw provider/network errors and object URLs in logs/responses. lib/r2.ts and reviewed auth/contact/proxy paths. | Bounded status/context and generic failures replace reviewed private provider payloads/object URLs. Tests assert contact/proxy redaction. Not a historical-log audit. |

Reference-image validation now rejects malformed/noncanonical base64 before decoding, checks a 5 MiB decoded limit and PNG/JPEG/WebP magic bytes. It does not fully decode images, validate pixel dimensions, or establish that all upload/parser paths are protected. Remote transport checks Content-Type; magic-byte validation occurs in the reference-image/reupload caller. Do not describe every remote response as fully content-validated.

## Actual verification

Environment: Windows PowerShell, local repository, Node 24.16.0, npm 11.13.0, Vitest 4.1.11. Command on 2026-09-30:

~~~powershell
npx vitest run tests/auth-security.test.ts tests/clerk-webhook-security.test.ts tests/contact-security.test.ts tests/direct-auth-security.test.ts tests/intern-security.test.ts tests/proxy-image-security.test.ts tests/requestSecurity.test.ts tests/safeRemoteImage.test.ts
~~~

**8 files passed, 112 tests passed**, 7.18 seconds. Raw local output: audit-security-final-tests.log (ignored artifact). Existing Vite CommonJS/ESM loader warning was not suppressed. No application source needed further changes during this final focused pass.

Clerk, database, Redis, provider delivery and HTTP/DNS transport are mocked. Webhook tests exercise the actual installed Svix verifier with a local test signing key. Cross-user assertions use separate mock identities, not two live accounts. The aggregate report owns final build/types/lint, dependencies, secret scan, browser and performance results.

## Unresolved risks and release limitations

- **High if drafts are promised private:** lib/r2.ts returns permanent public R2 URLs. Authenticating the proxy does not make the original files private; anyone obtaining a URL can bypass it. No bucket policy/access setting changed. Private-object delivery, owner-aware authorization and approved service configuration/migration are needed before claiming private media.
- **Live isolation unverified:** stage two isolated Clerk accounts with actual PostgreSQL/Redis/R2. Test direct read/write/export/delete across users, ordinary-user admin calls, suspension/deletion, token revocation, expiry/logout, and concurrent invitation/leave writes. Database roles/RLS, bucket policy, hosting headers and Clerk dashboard settings were not inspected through service dashboards.
- **Partial CSP:** only base-uri 'self'; object-src 'none'; frame-ancestors 'none'. It does not restrict scripts, connections or images. A tested nonce/script policy compatible with Clerk, billing and required integrations remains follow-up work.
- **Incomplete rate/resource coverage:** reviewed Redis limits are distributed, but deployment must ensure forwarded client IP headers cannot be spoofed. Contact provider delivery has no additional application-level deadline in this route. Not every upload, document parser, public tracking endpoint or expensive route was checked for distributed limits, streamed bounds or decompression/pixel expansion. No general denial-of-service resistance claim is supported.
- **Signup side effects are best effort:** idempotent account insertion does not durably recover welcome/referral/prefill side effects after a crash or session bootstrap winning the race. There is no signup outbox. Genuine identity conflicts require explicit account recovery.
- **Email synchronization:** existing DB email generally does not update on user.updated; admin checks both stored and current verified values and fails closed after email change. Account recovery/update behavior needs staging verification.
- **No complete secret assurance:** aggregate scanning compares known local privileged values with tracked files/public bundles; it does not establish Git history or historical logs are secret-free. No live credentials rotated.

No schema migration was introduced by this security work. Stage browser forms, extension bearer clients and signed webhooks against the mutation guard. Verify required Redis/R2/Clerk configuration using documented names without copying live values into reports. Production access changes/rotations require approval. Rollback is a code/build rollback; do not relink identities, replay ambiguous provider operations or modify production records automatically.


## Bounded content-hub follow-up

A subsequent report review identified a separate medium-severity reliability issue in app/api/content-hub/bulk-upload/route.ts: a scheduled-post insert failure could leave the preceding post insert committed, so a failed row appeared unsuccessful while an orphan draft remained and a retry created another post.

Each row now creates its post and schedule inside one Prisma interactive transaction. Rows remain independent, preserving partial success and later valid rows. Image rehosting and queue selection remain outside the short transaction. No automatic transaction/provider retry was added. The two custom-post/upload error logs now contain only the Error name, preserving existing transport/response behavior.

Added tests/content-hub-reliability.test.ts: successful owner-scoped row pairs, rollback when scheduling fails, continued later rows, retry after a definite rollback without orphan duplicates, post-insert failure, expired session, and upload log redaction. The transaction is a stateful mock; this verifies handler use of the transaction contract, not live PostgreSQL behavior.

Commands on 2026-09-30:

~~~powershell
npx vitest run tests/content-hub-reliability.test.ts tests/safeRemoteImage.test.ts
npx eslint app/api/content-hub/bulk-upload/route.ts app/api/content-hub/custom-post/upload/route.ts tests/content-hub-reliability.test.ts
~~~

Results: **2 files / 41 tests passed** (including 6 new content-hub regressions), 1.43 seconds; focused ESLint passed with no output. Full type/build verification is delegated to the final aggregate check.

Limits: the complete batch is intentionally not atomic; a timed-out/ambiguous commit or a client repeating an already successful row can still duplicate it because there is no persisted batch/row idempotency key. Image uploads preceding a failed transaction may leave unused R2 objects. Queue-slot reservation concurrency remains separate. Existing per-row operational error responses were not redesigned by this bounded change.
