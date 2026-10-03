// app/api/ext/x/rewrite/route.ts — Shorter / Longer for CarouseLabs Engage
// for X's replies (lib/engage/rewriteRoute.ts): resizes a reply, never past
// the account's X limit, counted the way X counts. Counts as "x_rewrites".
import { handleRewriteRequest } from "@/lib/engage/rewriteRoute"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  return handleRewriteRequest(req, "x")
}
