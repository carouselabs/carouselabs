// ════════════════════════════════════════════════════════════════════════════
// TESTING PHASE ONLY - the extension paywall can be switched off locally.
// MUST stay unset in production: remove COMMENT_CREDITS_ENFORCED=false from
// local env (this repo's .env.local, gitignored) before testing the paywall,
// and confirm it is not set anywhere in Vercel's Production environment — its
// absence IS the enforced state; there is nothing else to flip.
//
// Despite the name (kept so existing env files keep working), this now gates
// the extension paywall in lib/extAccess.ts — 10 free generations per account,
// then the $15/month extension subscription — which every model-backed
// app/api/ext route goes through, and which /api/ext/me reports to the side
// panel as access "testing" so the panel lifts its paywall too.
//
// Rate limits (lib/extDailyLimit.ts) are NOT governed by this flag and stay
// active while it is off.
// ════════════════════════════════════════════════════════════════════════════

// Read from the environment rather than hardcoded, and safe-by-default:
// enforced (true) unless the env var is present and is exactly the string
// "false". Unset, empty, "0", "no", "True", or a typo of any kind all leave
// the paywall ENFORCED — only the literal value "false" bypasses it. This
// matters because this file is the same source in every environment; if the
// bypass were a hardcoded `= false` constant instead, deploying this exact
// commit to production would silently disable the paywall there too, with no
// environment-specific gate to catch it.
//
// To bypass locally: add COMMENT_CREDITS_ENFORCED=false to .env.local
// (gitignored, never committed). Never set this in Vercel's Production
// environment.
export const COMMENT_CREDITS_ENFORCED = process.env.NODE_ENV === "production" || process.env.COMMENT_CREDITS_ENFORCED !== "false"
