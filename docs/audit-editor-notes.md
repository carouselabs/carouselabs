# Editor audit verification - 2026-09-30

Scope: caption, single-image and carousel draft creation, save/reopen, browser recovery and scheduling handoff. These are local repository changes; no live accounts, database writes, AI generation or deployment were used for verification.

## Important changes

- Draft writes use one ordered queue per editor, bounded requests and optimistic revision preconditions. Failed saves do not display success. Create retries retain an owner-scoped operation ID; conflicting updates return 409 and preserve the browser copy.
- Post reads and mutations require authentication and owner filters. Server schemas bound captions, slides, prompts and image URLs. Media must use the configured R2 origin and the authenticated owner's expected storage path. Media children and post metadata update in the same database transaction after a successful revision check.
- Single-image Save Draft and Schedule now send the displayed image URL, prompt and dimensions, rather than only the caption. The saved indicator compares the whole submitted media snapshot. Saving/scheduling is blocked while initial restore is unconfirmed or image generation is still running.
- Caption, image and carousel initialization now writes the selected server/browser snapshot before recording its base revision. Explicitly restoring a recovery copy persists the selection and clears its recovery notice. Partial browser-storage writes remove the base marker first, so mixed or incomplete snapshots cannot silently supersede the server on the next visit. Save completion advances only a recognized browser lineage and never replaces text typed while that request was in flight.
- Carousel save/reopen preserves per-slide prompts as well as media, ordering and dimensions. Incomplete carousel generation prevents scheduling. Existing changes also add export error feedback and lazy PDF loading.

## Verification actually run

Environment: Windows PowerShell, Node 24.16.0, installed workspace dependencies (Next 16.3.7, Vitest 4.1.11); mocked network/database boundaries and jsdom for the caption UI test.

- npm test -- --run tests/post-draft.test.ts tests/draft-recovery.test.ts tests/posts-routes.test.ts tests/caption-editor.test.tsx - **PASS: 4 files, 37 tests**, exit 0; final duration 5.54 seconds.
- npm run typecheck - **PASS**, exit 0.
- npx eslint lib/postDraft.ts lib/draftRecovery.ts lib/postInput.ts 'app/(app)/generate/caption/_client.tsx' 'app/(app)/generate/image/_client.tsx' 'app/(app)/generate/carousel/_client.tsx' 'app/api/posts/[id]/route.ts' app/api/posts/route.ts tests/post-draft.test.ts tests/draft-recovery.test.ts tests/posts-routes.test.ts - **PASS with warnings: 0 errors, 5 warnings**. Existing unused image-generation helpers/prop and initialization effect dependencies remain visible; no rule was disabled to obtain this result.

Regression coverage includes serialized writes, coalesced save/schedule snapshots, expired sessions, conflicts, timeout without mutation retry, malformed success responses, media-only and size-only changes, user A/B owner filters, cross-user media rejection, atomic media replacement after revision checks, current/stale browser recovery, storage quota failure and in-flight newer typing preservation.

## Limits and remaining risks

- Route ownership/transaction tests mock Prisma and authentication. Real two-account access isolation, PostgreSQL transaction/concurrency behavior, session expiry in Clerk and actual generation/export/scheduling journeys still require isolated staging credentials. These tests do not establish end-to-end integration correctness.
- Existing R2 object URLs are public. Owner validation prevents attaching another user's URL through these save endpoints, but does not make previously uploaded objects private.
- Browser storage can be unavailable, full or cleared. A warning is shown; server Save Draft remains explicit. Local-only recovery is not a durable backup and is not synchronized across devices.
- The UI's generation flow, upload boundaries, mobile loading-game layout and every export dimension/font combination have not been comprehensively exercised in an authenticated browser. Legacy drafts without stored per-slide prompts cannot reconstruct their original prompts.
- Some provider generation endpoints create a fresh post on regeneration; durable reconciliation of a lost provider/save response remains a broader billing/job concern. No automatic retries of save mutations were added.

No editor database schema migration is required. Deploy application changes together; verify create - edit - save - refresh - reopen - schedule on isolated staging accounts, including a second-tab conflict and recovered media. Rollback uses the preceding application artifact. Do not overwrite newer saved drafts or delete recovery/browser data during rollback.

## Public canvas lifecycle follow-up - 2026-10-01

The first Tap & Hold upload now hands decoded pixels to its renderer in a layout effect after the conditional canvas mounts. The previous animation-frame handoff could run before React committed the canvas and leave a blank editor. Request sequence checks discard older decode completions; replacement and unmount dispose image resources, renderer/brush frames and cursor elements. Fallback image decode failures now revoke their temporary object URL and remove image event handlers. Active exports receive an AbortSignal and are canceled when their source is replaced or the editor unmounts; canceled exports do not announce success.

Verification: `npm test -- --run tests/tap-hold-lifecycle.test.tsx tests/image-loader.test.ts` passed **2 files, 11 tests** (final run 3.30 seconds). Tests cover first conditional mount before animation frames, out-of-order uploads, replacement/unmount disposal, late decode completion, export cancellation before/after its start, and native/fallback image decode cleanup. Canvas rendering and browser image decoding are stubbed in these jsdom tests; visual output correctness remains part of the separate production-browser verification. `npm run typecheck` passed. Scoped ESLint on both changed components and both test files passed with **0 errors and 0 warnings**. No additional dependencies or database migration.


## Lost create response follow-up - 2026-10-04

Final review found a false-success case in owner-scoped create retries: the database upsert returned the original post, but the handler compared only caption, idea and image URLs. If the response was lost and the user then changed dimensions, prompts or slide metadata, the retry could report the newer content saved without persisting those changes.

The create handler now reads the persisted child slide fields and compares a canonical draft snapshot, including owner/idea, title, caption, format, image URLs/keys, dimensions, image prompt and ordered slide roles/headlines/prompts/media. Optional JSON nulls and omitted fields normalize consistently; input slide order and omitted default dimensions do not cause false conflicts. Changed content returns 409 with instructions to preserve the edits and reopen the saved draft; it never overwrites the existing row or advances the editor's confirmed revision. The operation key lasts for the editor writer's lifetime, not across a reload. A changed replay requires explicit recovery/reopen; it is not automatically retried or turned into another post.

Added 11 regression cases in tests/posts-routes.test.ts. A stateful mocked database returns the original committed payload on replay. Coverage includes dimensions, image/slide prompts, removed optional prompts, slide roles/headlines/numbers, changed format, canonical equivalent retries, and a writer-to-handler scenario where the first response is lost after commit. This remains a mocked boundary test, not live PostgreSQL verification.

Verification:

- npm test -- --run tests/posts-routes.test.ts tests/post-draft.test.ts: PASS, 2 files / 36 tests; final rerun 6.36 seconds.
- npx eslint app/api/posts/route.ts tests/posts-routes.test.ts: PASS, 0 errors / 0 warnings.
- npm run typecheck: PASS after correcting the optional create-data union narrowing; no type checks suppressed.

No schema change or new dependency. The aggregate report owns the subsequent final build/check totals.
