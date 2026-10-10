// app/api/ext/agents/builder/route.ts — the AI agent builder
// (lib/engage/agentBuilder.ts), for the extension panel only: the extension's
// token is required, a website session isn't enough (the website never
// generates). Free, capped per person per day.
//
// POST { action: "interview", description, answers }  → { done, question?, hint?, optional?, topic? }
// POST { action: "draft", description, answers }      → { draft }
// POST { action: "refine", draft, instruction }       → { draft, changed }
import { NextResponse } from "next/server"
import { extensionCallerPlatform, getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight } from "@/lib/engage/gate"
import {
  assertBuilderAllowance,
  BuilderError,
  draftAgent,
  nextInterviewStep,
  parseAnswers,
  parseDescription,
  refineAgent,
} from "@/lib/engage/agentBuilder"
import { parseAgentInput } from "@/lib/engageAgents"

export const maxDuration = 60

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  const platform = extensionCallerPlatform(req)

  // Suspended accounts, switched-off messages, an outdated extension: same
  // checks as a reply. Nothing is reserved: building is free.
  const preflight = await engagePreflight(user.id, platform === "x" ? "x_messages" : "messages", req)
  if (preflight.response) return preflight.response

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const action = body?.action
  try {
    if (action !== "interview" && action !== "draft" && action !== "refine") {
      throw new BuilderError(400, 'action must be "interview", "draft" or "refine"')
    }
    // Input checks before the allowance, so a bad request costs nothing.
    if (action === "refine") {
      const parsed = parseAgentInput({ ...(body?.draft as object), status: "draft" })
      if (!parsed.ok) throw new BuilderError(400, parsed.error)
      await assertBuilderAllowance(user.id)
      return NextResponse.json(await refineAgent(user.id, platform, parsed.value, body?.instruction))
    }
    const description = parseDescription(body?.description)
    const answers = parseAnswers(body?.answers)
    await assertBuilderAllowance(user.id)
    if (action === "interview") return NextResponse.json(await nextInterviewStep(user.id, platform, description, answers))
    return NextResponse.json({ draft: await draftAgent(user.id, platform, description, answers) })
  } catch (err) {
    if (err instanceof BuilderError) {
      return NextResponse.json({ error: err.message, ...(err.code ? { code: err.code } : {}) }, { status: err.status })
    }
    console.error("[ext/agents/builder] failed:", err)
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 500 })
  }
}
