// app/api/ext/message/route.ts — the Conversation Assistant. Same shape as
// app/api/ext/connection-note: Bearer-token auth, the shared daily generation
// limit, and the extension access gate (lib/extAccess.ts) reserved before the
// model call and given back if no message survives validation.
//
// Each message is saved to history (kind "message"), so it shows in the
// History screens in the panel and on the website.
import { handleMessageRequest } from "@/lib/engage/messageRoute"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  return handleMessageRequest(req, "linkedin")
}
