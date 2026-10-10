// app/api/ext/agents/route.ts — custom AI conversation agents (model
// EngageAgent; lib/engageAgents.ts): the panel's Agents tab and Messages
// screen, and the website's Extension → AI agents. Either caller
// (getExtensionUser): the extension's token or the website's session, so both
// see and save the same agents under the same rules.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { AGENT_LIMITS, agentForClient, parseAgentInput } from "@/lib/engageAgents"

// GET /api/ext/agents — this user's agents, the default first, then newest.
export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const agents = await db.engageAgent.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  })
  return NextResponse.json({ agents: agents.map(agentForClient) })
}

// POST /api/ext/agents — create one. body: { name, description, purpose,
// status, config, setAsDefault? }. Duplicating is a POST of a copy.
export async function POST(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = parseAgentInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const count = await db.engageAgent.count({ where: { userId: user.id } })
  if (count >= AGENT_LIMITS.agentsPerUser) {
    return NextResponse.json(
      { error: `You have ${AGENT_LIMITS.agentsPerUser} agents, the most there can be. Delete one to add another.` },
      { status: 400 },
    )
  }

  const setAsDefault = (body as { setAsDefault?: unknown }).setAsDefault === true
  const { config, ...fields } = parsed.value
  const agent = await db.$transaction(async (tx) => {
    if (setAsDefault) await tx.engageAgent.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } })
    return tx.engageAgent.create({ data: { ...fields, config: { ...config }, userId: user.id, isDefault: setAsDefault } })
  })
  return NextResponse.json({ agent: agentForClient(agent) }, { status: 201 })
}
