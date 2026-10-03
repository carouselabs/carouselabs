// app/api/ext/rewrite/route.ts — the Shorter / Longer buttons. Takes a comment
// that already exists and resizes it, rather than generating a new one, so the
// specific detail and the voice that made the original work survive.
//
// Access: a rewrite is a model call like any other, so it goes through the
// same extension access gate (lib/extAccess.ts) and shared daily limit as
// generate/route.ts.
import { handleRewriteRequest } from "@/lib/engage/rewriteRoute"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  return handleRewriteRequest(req, "linkedin")
}
