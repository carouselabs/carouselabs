// lib/referralConstants.ts
// Pure constants/validation with NO `db` import — safe to import from
// proxy.ts (runs on every request) without pulling Prisma into that path.
// lib/referral.ts (the DB-touching half of the referral program) re-exports
// these so callers only ever need one import for the whole feature.

// Uppercase alphanumeric, excluding visually-ambiguous characters
// (0/O, 1/I/L) so a code read aloud or hand-typed from a screenshot doesn't
// misfire on a lookalike character.
export const REFERRAL_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const REFERRAL_CODE_LENGTH = 7

// Loose validation for codes arriving from outside our own generator (the
// `ref` query param / cookie) — same charset, generous length bounds in case
// REFERRAL_CODE_LENGTH ever changes.
export const REFERRAL_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4,10}$/

export const REFERRAL_COOKIE_NAME = "cl_ref"
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days
