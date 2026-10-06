# Stability

The current state of the website and both extensions: what was checked, what was fixed, how to re-run the checks, how to recover, and what is still unverified. Results from 2026-10-05 and 2026-10-06, on `main` at `9ce9ce0` plus uncommitted changes. Background: [audit report](docs/AUDIT-2026-09-30.md), [main integration](docs/MAIN-INTEGRATION-2026-10-04.md), [dependency notes](docs/audit-dependency-notes.md), and, for Insert and Generate, [the extension's architecture](browser-extension-comment/ARCHITECTURE.md).

**Status: not release-verified.** Every browser result below is a *fixture-browser* result: real Chromium, but on saved copies of LinkedIn and X pages without the sites' own scripts. Nothing has been checked on live LinkedIn or X, and nothing server-side has run on Vercel. See "Live checks still needed".

## What the product is

| Part | Where | Notes |
| --- | --- | --- |
| Website and admin | Next.js 16 app (`app/`, `lib/`, `proxy.ts`) on Vercel, Mumbai (`bom1`) | Clerk 7 sign-in; Prisma 5 on Supabase Postgres; Lemon Squeezy billing; Vercel crons. `admin.carouselabs.com` is the same app. |
| CarouseLabs Engage for LinkedIn | `browser-extension-comment/` | Live in the store: 1.2.1 (non-streamed Generate). This build: 1.3.0. |
| CarouseLabs Engage for X | the same folder, `vite.x.config.ts` | This build: 1.0.0. |
| Extension API | `app/api/ext/*`, `lib/engage/commentEngine.ts`, `lib/ai/commentModel.ts` | Shared by both extensions and every released version of them. |

## Issue summary

| Issue | Fix implemented | Fixture tests | Live / deployed verification | Remaining blocker |
| --- | --- | --- | --- | --- |
| Insert put a comment in the wrong post (two tabs) | Each capture carries the post's ids; Insert only fills that post | Reproduced, then fixed: e2e `insertReliability` | Not checked | Live check L3 |
| One Insert typed 2–3 times | Insert id + `insertOnce`; panel ignores a second click, shows "Inserted" | Reproduced, then fixed: e2e + unit | Not checked | Live check L5 |
| Insert failed after LinkedIn redrew the post card | Finds the card again by componentkey / permalink | Simulated redraw: e2e | Not checked; whether LinkedIn keeps the componentkey on redraw is unknown | Live check L1, L4 |
| Insert failed when the box opened late | Waits up to 2 s for it | e2e | Not checked | Live check L1 |
| Insert failed after the content script was replaced | Same ids | e2e | Not checked | – |
| X: a reply with line breaks typed twice and reported failed | One shared check that ignores line breaks/spaces/emoji; paste only if nothing changed | Reproduced, then fixed: e2e (stand-in for Draft.js's paste) | Not checked | Live check X1 |
| Insert said "done" without checking | Confirms the box holds the text after the editor's redraw; never writes text into the page | unit + e2e with a stand-in "framework" editor | Not checked against LinkedIn's or X's editor | Live checks L1–L6, X1–X3 |
| Insert waited on the network every time | Insert switch cached 5 min | unit | Not checked | – |
| A connection note replaced the person's own text (silently) | Never without their choice: Insert stops and offers "Replace it with this note"; only the extension's own unedited earlier note is replaced without asking. No undo is promised. | unit + e2e | Not checked | Live check L7 |
| Slow fallback (Luna silent → 10 s before Haiku) | Hand-over after 4 s without words; now settable (`ENGAGE_FIRST_TEXT_MS`) | Controlled: 10,000 ms → 4,000 ms | Real models: see Performance; not deployed | Production query P1; deploy |
| A comment just past a rough length bucket was regenerated | 10% slack for buckets; explicit "N-M characters" ranges stay strict (owner's decision) | Controlled: 2 calls → 1 | Real models: weak (1 vs 2 regenerations in 24 pairs) | – |
| Stop / closing the panel kept generating and charged a free use | Request signal + stream cancel stop the model; free use given back; `vercel.json` `supportsCancellation` on the two generation routes; cleanup kept alive with `after()` | unit: 6 cancellation cases | Not deployed: Vercel behaviour unverified | Deployed check D1–D3 |
| A refund could run twice | Every release gives back at most once (`onlyOnce`) | unit | – | – |
| Generic errors offline / signed out | Plain wording; a 401 signs the panel out | unit | Not checked | – |
| Sign-in e2e failed once (43 s run) | Cause not found. A stale-worker hypothesis was tested and ruled out. The harness now keeps a trace of any failure (Playwright's `--trace` never covered these tests). | 1 failure in ~25 runs; 20 repeats and a full in-order run since: all pass | – | **Unresolved** |
| `dist-store` was an old build | Build commands corrected; a script checks each build | All four builds checked | – | – |
| A unit test read the database in `.env` | Stand-in added | ✓ | – | – |
| Sign-in page blank / 404 on "Add intern" (10-05) | 401 `session_expired` instead of 404 | unit | Not deployed | Network cause is external |
| Dependency warning (`braces`) | Shipped dependencies clean; CI checks them | `npm audit --omit=dev` = 0 | – | – |

## Performance evidence (2026-10-06)

Kept apart, because they prove different things:

**1. Controlled proof that the fallback delay changed** (unit test, simulated clock, model stand-ins; `generateStream.server.test.ts` "controlled comparison"): the same silent Luna is handed to Haiku after **10,000 ms under the old rule and 4,000 ms now**. Haiku's stand-in answers at once, so this is the hand-over delay alone.

**2. Controlled proof that unnecessary regenerations were removed**: a clean 228-character comment for a "Short (1-2 lines)" (40–220) profile is now kept: 1 model call instead of 2. A 228-character comment for an explicit "100-220 characters" profile is still regenerated (strict, as decided). Each fails if the rule is removed.

**3. Real-model observations** (`tests/bench/abLatency.bench.test.ts`, 2026-10-06, from this laptop in India, the real route and real models, database/sign-in/limits stood in for): 3 posts × 4 system profiles, each run under the old rules (`ENGAGE_FIRST_TEXT_MS=10000`, no slack) and today's, back to back, order swapped every pair, 2 passes: 24 pairs, 48 requests. "Total" is the whole logical request: every attempt and fallback until the final comment. "Typical" = median.

| Rules | n | Failures | Total, median | Total, max | First text, median | Second generations | Answered by Haiku |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Old | 24 | 0 | 2,145 ms | 8,357 ms | 1,439 ms | 2 | 0 |
| Today | 24 | 0 | 2,211 ms | 8,568 ms | 1,733 ms | 1 | 2 |

- **No overall speed change was detected**: today's rules were slower in 14 pairs and faster in 10 (median paired difference +146 ms) — no different from chance (sign test p ≈ 0.5). The two medians differ by hundreds of ms even though the runs were interleaved: this sample size can't detect differences under about half a second. (An earlier remark that "the provider was slower that hour" was a guess; it is not supported.)
- **The 4 s hand-over fired twice in 24** (Luna had written nothing by 4 s). In one pair the old rules let Luna answer at 5.8 s (done at 6.4 s), while today's switched to Haiku, which itself took 3.1 s to start: done at 8.6 s, **2.2 s slower**. No true silent stall happened in these 48 requests; Luna's first words took 3–6 s in several (the first request of the run, a cold connection, took 5.8 s).
- Regenerations: 3 in 48 requests. Two were explicit ranges kept strict ("15-45": 51 characters; "100-220": 221).
- **Recommendation**: keep 4 s for now, as decided, but expect it to cost time when Luna is slow rather than stuck. If production query P1 shows Luna's first words often take 4–6 s and true stalls are rare, set `ENGAGE_FIRST_TEXT_MS=6000` on Vercel (no code change; applies from the next deployment).

**4. Full user-visible production latency: not measured.** Needs read-only production data (no access here): run in Supabase and send the results.

```sql
-- P1: model calls for comments and replies, last 14 days
select model, fallback, streamed, outcome, count(*) as calls,
  percentile_cont(0.5) within group (order by "firstTokenMs") as first_token_p50_ms,
  percentile_cont(0.9) within group (order by "firstTokenMs") as first_token_p90_ms,
  count(*) filter (where "firstTokenMs" between 4000 and 10000) as first_token_4_to_10s,
  count(*) filter (where outcome = 'timeout') as timeouts,
  percentile_cont(0.5) within group (order by ms) as call_p50_ms,
  max(ms) as slowest_ms
from "EngageAiCall"
where "createdAt" > now() - interval '14 days' and kind in ('comments', 'replies')
group by 1, 2, 3, 4
order by calls desc;

-- P2: Insert failures the panels reported (1.3.0 and X), last 30 days
select feature, code, "extensionVersion", count(*) as failures
from "EngageClientError"
where "createdAt" > now() - interval '30 days' and (code like 'insert.%' or code like 'tab_%')
group by 1, 2, 3
order by failures desc;
```

These are per *model call*, not per request the person waited for. The whole request is in Vercel's logs: `[ext/generate] timing req=<id> stream= model= attempts= cancelled= auth= limit= profile= reserve= ttft= first_text= generate= history= total=` (the panel prints `[perf] generate req=<same id>`).

## Cancellation and free-use accounting

**Path.** Stop, Regenerate, a new post or closing the panel aborts the panel's `fetch` (the request itself, not just the display: covered by `noStuckSpinners.test.tsx`). The background worker is not involved: the panel calls the API directly. On the server, three signals mean the client left: `request.signal` (Vercel aborts it when cancellation is enabled; Next's own server aborts it when the connection closes before the response finished), the response stream being cancelled, and a failed write. Any of them stops the model call (the OpenAI/Anthropic SDK request is aborted) and starts no new attempt.

**Vercel.** Per Vercel's docs, cancellation is opt-in per function in `vercel.json`, and the function is then *terminated* on disconnect: only work in `waitUntil`/`after()` survives. So `supportsCancellation` is set for exactly `app/api/ext/generate/route.ts` and `app/api/ext/x/reply/route.ts`, and the remaining work (stopping the model, giving the free use back, or saving a finished comment) is kept alive with Next's `after()` (`holdOpen` in `lib/engage/commentEngine.ts`). The other AI routes are unchanged.

**Policy (unchanged in intent, now applied to cancellation).** The routes' rule has always been: "a user is never charged for output they never saw, and a failed request writes no history row". A comment is delivered when its final event reaches a client still listening. The streamed draft before that is read-only in the panel (no Copy, no Insert; Stop puts back what was there), so a request stopped mid-draft counts as not delivered: free use given back, no history row. Before this change the code finished such generations after the client left, saved them and charged them; that contradicted the rule. If you prefer "finish it and keep it in History" for stops mid-draft, that is a small change.

**Cases tested** (`generateStream.server.test.ts`, `engageAccess` / `extensionPaywall` server tests):

| Case | Result |
| --- | --- |
| Stop before any output | model call stopped, no backup started, nothing saved, free use given back once |
| Stop during streaming, reported twice (request abort + stream cancel) | given back once |
| Regenerate right after Stop | stopped one given back, new one saved and charged |
| Client leaves at the moment the comment finishes | not delivered: not saved, given back |
| Closing the panel after the comment arrived | saved, charged, never given back |
| 1.2.x JSON request abandoned mid-generation | model stopped, given back |
| `release()` called 3 times | one free use given back, usage counters once |

Remaining edge: a client leaving *during* the final history write (milliseconds) is charged although the final event may not arrive.

**Refund ≠ provider cost.** Giving the free use back changes only the user's count. The AI provider still bills the tokens it processed before the call was stopped (input tokens, and any output already written); stopping early only avoids the rest. Admin → Engage → AI records such calls with outcome "cancelled" when the record is written before the function ends (best effort).

## Verification results (2026-10-06, final code)

| Check | Result |
| --- | --- |
| `npm run lint` | 0 errors, 16 warnings (pre-existing) |
| `npm run typecheck` / `npm test` | pass / 23 files, 255 tests |
| `npm run build` (in `.next-verify`, deleted afterwards) | pass, final code (`vercel.json` itself is only read by Vercel: check D1) |
| Extension `npx tsc -b` / `npx vitest run` | pass / 62 files, 776 tests |
| Builds (commands below) | all four built 2026-10-06 14:11–14:13 UTC and checked (table below) |
| Fixture e2e, LinkedIn `dist` | 34 passed, 29 skipped (X-only), 0 failed |
| Fixture e2e, LinkedIn `dist-store` | 34 passed, 29 skipped, 0 failed (and 34/34 in the earlier in-order rerun) |
| Fixture e2e, X `dist-x` | 13 passed, 8 skipped (LinkedIn-only), 0 failed |
| Fixture e2e, X `dist-x-store` | 12 passed, 9 skipped (also the development-only `xLayout`), 0 failed |

Mutation checks: every new rule (insert once, re-finding the post, paste only if unchanged, double-click guard, length slack, strict explicit ranges, request-signal cancellation, delivered-or-refunded, JSON-path cancellation, refund once, the configurable hand-over, asking before replacing a note) was removed in turn; each removal fails at least one test.

### Builds

| Folder | Command (in `browser-extension-comment/`) | Manifest version (as Chrome shows it) | API | localhost permission |
| --- | --- | --- | --- | --- |
| `dist-store` (LinkedIn, upload this) | `npm run build -- --outDir dist-store` | 1.3.0 | https://carouselabs.com | no |
| `dist` (LinkedIn, development) | `npm run build:dev` | 1.3.0 dev <build time> UTC | http://localhost:3000 | yes |
| `dist-x-store` (X, upload this) | `npm run build:x -- --outDir dist-x-store` | 1.0.0 | https://carouselabs.com | no |
| `dist-x` (X, development) | `npm run build:x:dev` | 1.0.0 dev <build time> UTC | http://localhost:3000 | yes |

Plain `npm run build` writes to `dist`, not `dist-store`: on 2026-10-06 `dist-store` turned out to be an old build for that reason. The check script (fixes present, version, API, localhost) is in the session notes; the same checks by hand: `manifest.json` in each folder, and searching `assets/*.js` for "isn't open in this tab" (LinkedIn), "already has text you wrote" (LinkedIn), "isn't ready to type in" (X), "__carouselabsInserts" (both).

## Commands

From the repository root:

```sh
npm run check                     # lint + typecheck + website unit tests
npm run build                     # website production build
npm audit --omit=dev --audit-level=high
npm audit --omit=dev --audit-level=high --prefix browser-extension-comment
```

From `browser-extension-comment/` (run browser suites one at a time, nothing else heavy alongside):

```sh
npx tsc -b && npx vitest run
npm run build -- --outDir dist-store && npm run build:dev
npm run build:x -- --outDir dist-x-store && npm run build:x:dev
EXT_DIST=dist npx playwright test
EXT_DIST=dist-store npx playwright test
EXT_DIST=dist-x npx playwright test tests/e2e/x*.spec.ts tests/e2e/signIn.spec.ts tests/e2e/workerRestart.spec.ts tests/e2e/insertReliability.spec.ts
EXT_DIST=dist-x-store npx playwright test tests/e2e/x*.spec.ts tests/e2e/signIn.spec.ts tests/e2e/workerRestart.spec.ts tests/e2e/insertReliability.spec.ts
npx playwright show-trace test-results/<failed test>/trace.zip   # a failed e2e keeps its trace
BENCH_PAIRS_REPS=2 npx vitest run --config vitest.bench.config.ts tests/bench/abLatency.bench.test.ts   # 48 real-model requests, a few cents
```

## Live checks still needed

Done by the owner, signed in, on real LinkedIn and X. **Never click Post, Reply, Send or Connect.**

**Setup**
1. `chrome://extensions` → switch **off** the Web Store "CarouseLabs Engage" (and "for X", if installed) and any older unpacked copy. Only one LinkedIn copy and one X copy may be on.
2. Developer mode on → Load unpacked → `C:\Users\anant\carouselabs\browser-extension-comment\dist-store`, then `...\dist-x-store`.
3. Each card must say version **1.3.0** / **1.0.0**, and Details → "Loaded from" must end in `dist-store` / `dist-x-store`. To confirm the new files: Details → "Inspect views: service worker" → Console: `chrome.runtime.getManifest().web_accessible_resources.flatMap(w => w.resources).find(r => r.includes("content-script"))` must print `assets/content-script.ts-Bz88KASq.js` (LinkedIn) / `assets/content-script.ts-Cmlg07xR.js` (X) for the builds of 2026-10-06 14:11–14:13 UTC (a rebuild prints the new folder's own name: compare with `manifest.json` there).
4. Reload every LinkedIn and X tab. Sign in from each panel (a newly loaded copy is a new extension and needs its own sign-in).

**LinkedIn** (pass = the text appears once, in the right box, stays, and LinkedIn treats it as typed: its Post button turns on, you can keep typing)
- L1 Comment: click Comment on a post, Generate, Insert. Click elsewhere on the page, then back into the box and type " ok". Scroll the post out of view and back.
- L2 Reply: click Reply under a comment, Generate, Insert → goes into that reply box (after LinkedIn's @mention), not the main comment box.
- L3 Two tabs: tab A post X, tab B post Y. Capture post X in A and generate; switch to B; Insert → must go into post X's box if post X is in tab B, otherwise the panel must say the post isn't open in this tab. Never post Y's box.
- L4 Several open editors: open the comment boxes of three posts, capture one, Insert → only that one.
- L5 Your draft + double click: type "My words" in the box first, then double-click Insert → "My words" kept, the text added once after it, the button shows "Inserted".
- L6 DM: open a conversation, Messages → Read → Generate → Insert → in that conversation's box, once.
- L7 Connection note: Connect → Add a note, type "My note", Insert → the panel offers "Replace it with this note", the box still says "My note". Click it → replaced. (Ctrl+Z is not promised.)

**X**
- X1 Reply on a post → Generate a reply with a line break (or add one in the panel's box) → Insert → appears once, line break kept; type " ok" after it; X's Reply button turns on.
- X2 Double-click Insert → once.
- X3 Chat: open a chat → Messages → Read → Generate → Insert → once in that chat's box.

**Send back**: L1–L7, X1–X3 as pass/fail. For any fail: a screenshot of the panel and of the page box, and the page's console lines starting with `[content-script]` (right-click the page → Inspect → Console).

## Deployed checks still needed (after the website is pushed)

- D1 The deployment builds with the new `vercel.json` `functions` block (a wrong pattern fails the build; production then stays on the previous deployment).
- D2 Stop a Generate after the first words: Vercel's log shows `[ext/generate] timing req=… cancelled=1`, and Admin → Engage → AI shows the call as "cancelled". On a free account the free count is unchanged afterwards.
- D3 Let one finish, then close the panel: the count goes up by one and History has it.

## Compatibility (checked)

- New server + LinkedIn 1.2.1 (store): the JSON Generate path is unchanged and tested, including the new cancellation; 1.2.1 sends no request id (logged `req=-`).
- New server + extensions built before this change: requests without the new header are accepted (most server tests send none).
- Old server + these extension builds: the builds only add a request-id header (ignored by older servers); Insert changes live entirely in the extension; "Generate still works against a server from before streaming" (e2e) still passes.
- Stored data: these builds add one field (`target`) to `lastSelectedPost`; older versions read that object by field name and ignore it. No new storage keys, no database change.

## Recovery

**Vercel backend (website and API).** Dashboard → Project → Instant Rollback → choose the previous production deployment → Confirm. Hobby plans can only go back to the immediately previous deployment; Pro to any earlier production deployment. Vercel then stops auto-assigning production, so later pushes won't go live until **Undo Rollback** (or `vercel promote <deployment>`). The rolled-back deployment keeps its own build-time config (its `vercel.json`, crons); environment variables are not changed by a rollback. No database change came with this work, so nothing to undo there; never run the `*-rollback.sql` scripts as routine. To keep the code but drop only cancellation: remove the `functions` block from `vercel.json` and redeploy.

**LinkedIn extension.** Chrome Web Store Developer Dashboard → the item → ⋮ (or Build → Package) → "Roll back to previous version", give a new version number and a reason. It re-publishes the *previous published* version (today 1.2.1) under that new number, within about a minute, without review, and Chrome auto-updates users to it. It discards any pending or staged submission. 1.2.1 works with the new server (above), and the data these builds store is compatible with it.

**X extension.** Same procedure, but a rollback needs a previously published version. If 1.0.0 is the first one published, there is nothing to roll back to: unpublish the item from the dashboard, or upload a fixed version for review.

Uploading: the Web Store needs a version higher than the published one. If 1.3.0 (or X 1.0.0) is already sitting in review, either cancel that submission and upload this build, or raise the version (1.3.1 / 1.0.1) if the dashboard refuses the same number.

## Release order

1. Run in Supabase any SQL not yet applied: `scripts/x-extension-schema.sql`, `scripts/engage-admin-phase-c.sql` (covers phase B), `scripts/x-billing.sql`. (This work added none.)
2. Live checks L1–L7, X1–X3 with `dist-store` / `dist-x-store` (they use the live server, which doesn't need the new server code for Insert).
3. Push `main`; then deployed checks D1–D3.
4. Upload `dist-store` and `dist-x-store` (zip each folder).
