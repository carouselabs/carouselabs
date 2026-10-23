// app/api/ext/reddit/rewrite/route.ts — Shorter / Longer for CarouseLabs
// Engage for Reddit's comments (lib/engage/rewriteRoute.ts): resizes a
// comment, never past Reddit's 10,000 characters. Counts as "reddit_rewrites".
import { handleRewriteRequest } from "@/lib/engage/rewriteRoute"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  return handleRewriteRequest(req, "reddit")
}
