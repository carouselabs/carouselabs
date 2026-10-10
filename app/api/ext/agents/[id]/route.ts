// app/api/ext/agents/[id]/route.ts — edit or delete one agent. Every query is
// scoped by userId, so an id belonging to someone else reads as not found.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { agentForClient, parseAgentInput } from "@/lib/engageAgents"

// PUT /api/ext/agents/:id — body: the whole agent (as POST), plus the
// `version` it was edited from, and optionally setAsDefault (true makes it
// the default, false stops it being the default).
//
// The version is how two copies can't overwrite each other unnoticed: the
// panel and the website (or two browsers) may each hold the agent, and a
// save from an out-of-date copy gets 409 with the current agent instead.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = parseAgentInput(body)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const version = (body as { version?: unknown }).version
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return NextResponse.json({ error: "version is required" }, { status: 400 })
  }
  const setAsDefault = (body as { setAsDefault?: unknown }).setAsDefault

  const { config, ...fields } = parsed.value
  const updated = await db.$transaction(async (tx) => {
    const result = await tx.engageAgent.updateMany({
      where: { id, userId: user.id, version },
      data: {
        ...fields,
        config: { ...config },
        version: { increment: 1 },
        ...(typeof setAsDefault === "boolean" ? { isDefault: setAsDefault } : {}),
      },
    })
    if (result.count === 0) return null
    if (setAsDefault === true) {
      await tx.engageAgent.updateMany({ where: { userId: user.id, isDefault: true, NOT: { id } }, data: { isDefault: false } })
    }
    return tx.engageAgent.findUnique({ where: { id } })
  })

  if (!updated) {
    const current = await db.engageAgent.findFirst({ where: { id, userId: user.id } })
    if (!current) return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    return NextResponse.json(
      {
        error: "This agent was changed somewhere else (another browser or the website). Its latest version is loaded: check it, then save again.",
        agent: agentForClient(current),
      },
      { status: 409 },
    )
  }
  return NextResponse.json({ agent: agentForClient(updated) })
}

// DELETE /api/ext/agents/:id — conversations that used it fall back to the
// default reason in the panel.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const { id } = await params
  const result = await db.engageAgent.deleteMany({ where: { id, userId: user.id } })
  if (result.count === 0) return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
