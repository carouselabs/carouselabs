// app/api/own-idea/generate/route.ts
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { validateContentTopic } from "@/lib/validateTopic"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { Prisma } from "@prisma/client"

// PLACEHOLDER: no AI yet. This handler validates input, saves the idea (and a
// placeholder breakdown so /idea/[id] and every downstream generator work
// unchanged), and echoes the input back. The real prompt/refinement step will
// replace the mock outline below.
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Parse body
    let title: string
    let structure: string
    try {
      const body = await req.json()
      title = typeof body.title === "string" ? body.title.trim() : ""
      structure = typeof body.structure === "string" ? body.structure.trim() : ""
      if (!title) throw new Error("Please give your idea a title")
      if (!structure) throw new Error("Please describe your idea")
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid request body" },
        { status: 400 },
      )
    }

    // Keep CarouseLabs to social-media content — block general-assistant misuse
    // (code, homework, recipes, translation, etc.) across title + structure.
    const topicCheck = validateContentTopic([title, structure].join(" "))
    if (!topicCheck.valid) {
      return NextResponse.json(
        { error: topicCheck.error, invalidTopic: true },
        { status: 400 },
      )
    }

    // Create the Idea — source "own-idea" distinguishes it from trending ideas.
    const idea = await db.idea.create({
      data: {
        userId: user.id,
        title: title.slice(0, 300),
        hook: title,
        mode: "PERSONAL",
        category: "OTHER",
        source: "own-idea",
      },
    })

    // Placeholder breakdown: the user's own input verbatim. Having a cached
    // breakdown means /idea/[id] renders immediately and the caption/image/
    // carousel flows work without touching the trending-breakdown generator.
    const outline: BreakdownOutline = {
      refinedHook: title,
      deepDive: structure,
      keyTalkingPoints: "",
      strongEndingLine: "",
    }

    await db.breakdown.create({
      data: {
        ideaId: idea.id,
        userId: user.id,
        outline: outline as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({
      ideaId: idea.id,
      refinedHook: title,
      deepDive: structure,
      keyTalkingPoints: [],
      strongEndingLine: "",
    })
  } catch (err) {
    console.error("[own-idea/generate] unhandled error:", err)
    const message = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
