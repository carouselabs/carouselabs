// lib/redditText.ts — what a Reddit comment can be. Reddit takes up to 10,000
// characters (Markdown included) for a comment or a reply; profiles ask for
// far less, so this is only the ceiling a comment, or a Longer rewrite of
// one, must never pass. Plain text length: Reddit counts characters as typed.
export const REDDIT_MAX_LENGTH = 10_000
