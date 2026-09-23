// ════════════════════════════════════════════════════════════════════════════
// TESTING PHASE ONLY - credit checks disabled as of 2026-09-22.
// MUST restore before public launch: remove COMMENT_CREDITS_ENFORCED=false
// from local env (this repo's .env.local, gitignored) and confirm it is not
// set anywhere in Vercel's Production environment — its absence IS the
// restored (enforced) state; there is nothing else to flip.
//
// This one flag governs every Comment-extension generation route. Each carries
// the same marker; search the repo for "TESTING PHASE ONLY" to find them all:
//   - app/api/ext/generate/route.ts  (Comment / Regenerate / Reply: balance
//                                     check + charge; replies use this route)
//   - app/api/ext/rewrite/route.ts   (Shorter / Longer)
//   - app/api/ext/connection-note/route.ts (Connection request notes:
//                                     balance check + charge)
//   - app/api/ext/me/route.ts        (tells the side panel, so its
//                                     "Top up credits" block lifts as well)
//
// Rate limits are NOT governed by this flag and stay active while it is off.
// ════════════════════════════════════════════════════════════════════════════

// Read from the environment rather than hardcoded, and safe-by-default:
// enforced (true) unless the env var is present and is exactly the string
// "false". Unset, empty, "0", "no", "True", or a typo of any kind all leave
// credits ENFORCED — only the literal value "false" bypasses them. This
// matters because this file is the same source in every environment; if the
// bypass were a hardcoded `= false` constant instead, deploying this exact
// commit to production would silently disable credits there too, with no
// environment-specific gate to catch it.
//
// To bypass locally: add COMMENT_CREDITS_ENFORCED=false to .env.local
// (gitignored, never committed). Never set this in Vercel's Production
// environment.
export const COMMENT_CREDITS_ENFORCED = process.env.COMMENT_CREDITS_ENFORCED !== "false"
