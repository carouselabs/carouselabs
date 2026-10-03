// app/api/ext/x/message/route.ts — CarouseLabs Engage for X's DMs: writes the
// next message in an X chat, with the same reasons (MessageProfile), prompt
// and guardrails as LinkedIn's (lib/engage/messageRoute.ts). Counts as
// "x_messages" against the account's one plan; saved to history as
// "x_message".
import { handleMessageRequest } from "@/lib/engage/messageRoute"

// Generation stops itself after GENERATION_BUDGET_MS (lib/ai/commentModel.ts);
// this is the platform's backstop, well above it.
export const maxDuration = 60

export async function POST(req: Request) {
  return handleMessageRequest(req, "x")
}
