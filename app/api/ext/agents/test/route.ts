// app/api/ext/agents/test/route.ts — "Test this agent" in the panel's agent
// form: the agent being edited (saved or not) replies to a sample message, so
// the person can see how it answers before saving. The same prompt and checks
// as a real reply (lib/engage/messageRoute.ts, lib/engage/messageWriter.ts),
// plus a short note on why the reply fits.
//
// Extension only (the website never generates). Counted like the profile
// builder's Test: one generation of "tests" ("x_tests" in the X extension),
// so a free user's test uses one of their free generations.
//
// POST { draft, message, earlier?, action? } → { reply, why, freeRemaining }
import { NextResponse } from "next/server"
import { extensionCallerPlatform, getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { engagePreflight, reserveEngageGeneration } from "@/lib/engage/gate"
import { agentActionGuidance, agentActionOf, agentNumberSources, parseAgentInput } from "@/lib/engageAgents"
import { buildMessageSystemMessage, buildMessageUserMessage, type MessageThreadEntryInput } from "@/lib/ai/prompts/messagePrompt"
import { writeMessage } from "@/lib/engage/messageWriter"

export const maxDuration = 60

const MAX_SAMPLE_CHARS = 2000

function str(value: unknown, max: number): string {
  return typeof value === "string" ? Array.from(value.trim()).slice(0, max).join("") : ""
}

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  const platform = extensionCallerPlatform(req)
  const kind = platform === "x" ? "x_tests" : "tests"

  const preflight = await engagePreflight(user.id, kind, req)
  if (preflight.response) return preflight.response

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  // Tested as it will be used: it needs its goal.
  const parsed = parseAgentInput({ ...(body?.draft as object), status: "active" })
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const message = str(body?.message, MAX_SAMPLE_CHARS)
  if (!message) return NextResponse.json({ error: "Write a message someone might send you, to test against" }, { status: 400 })
  const earlier = str(body?.earlier, MAX_SAMPLE_CHARS)
  const action = agentActionOf(body?.action)

  // Their message, after what you said before (when given).
  const thread: MessageThreadEntryInput[] = [...(earlier ? [{ sender: "me" as const, text: earlier }] : []), { sender: "them", text: message }]
  const contact = { name: "Sample contact", headline: "" }
  const agent = { name: parsed.value.name, config: parsed.value.config }
  const fallbackProfile = { goal: parsed.value.config.goals, tone: parsed.value.config.tone }
  const system = buildMessageSystemMessage(fallbackProfile, false, platform, agent, { job: agentActionGuidance(action), output: "explained" })
  const userMessage = buildMessageUserMessage(contact, thread, undefined, platform, { output: "explained" })

  const gate = await reserveEngageGeneration(user.id, kind, preflight)
  if (!gate.ok) return gate.response

  const written = await writeMessage({
    system,
    user: userMessage,
    numberSources: [message, earlier, agentNumberSources(agent.config)].join(" "),
    label: "ext/agents/test",
    engage: { userId: user.id, kind },
    output: "explained",
  })
  if (!written) {
    await gate.release()
    return NextResponse.json({ error: "Something went wrong, try again" }, { status: 502 })
  }
  return NextResponse.json({ reply: written.message, why: written.why, freeRemaining: gate.freeRemaining })
}
