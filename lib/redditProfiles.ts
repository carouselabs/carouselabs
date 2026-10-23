// lib/redditProfiles.ts — rules specific to CarouseLabs Engage for Reddit's
// profiles. Profile fields are validated by lib/commentProfiles.ts, shared
// with LinkedIn and X; Reddit adds its own length ceiling.
//
// Reddit takes up to 10,000 characters (lib/redditText.ts), but a comment is
// written in one go within the generation time limit, and the longest preset
// ends at 1,500: profiles may ask for up to 2,000.
export const REDDIT_MAX_PROFILE_LENGTH = 2000

// A profile's "N-M characters" range must end within what a comment may be.
export function redditLengthProblem(length: string): string | null {
  const range = length.match(/(\d+)\s*-\s*(\d+)\s*char/i)
  if (!range) return null
  return Number(range[2]) > REDDIT_MAX_PROFILE_LENGTH
    ? `Reddit comments here can be at most ${REDDIT_MAX_PROFILE_LENGTH.toLocaleString("en-US")} characters, so the range must end there or below`
    : null
}
