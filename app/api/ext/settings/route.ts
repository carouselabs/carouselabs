// app/api/ext/settings/route.ts — the Comment extension's Settings screen.
// Bearer-token authenticated, same as the rest of app/api/ext/*.
//
// Only account-level settings live here. Purely local UI preferences (whether
// this browser renders the Insert button) stay in chrome.storage.local: they
// describe one install, not the account, and round-tripping them through the
// server would make them follow a user to a machine where they meant nothing.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"

// Mirrors the language list the profile builder offers.
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"]

export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  return NextResponse.json({
    defaultCommentProfileId: user.defaultCommentProfileId,
    defaultLanguage: user.defaultLanguage,
    insertWarningHidden: user.insertWarningHidden,
  })
}

// PATCH — every field is optional, so the client can send just what changed.
// Written as a named allowlist rather than spreading the body, so a future
// User column cannot be set from the extension by accident.
export async function PATCH(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const data: {
    defaultCommentProfileId?: string | null
    defaultLanguage?: string | null
    insertWarningHidden?: boolean
  } = {}

  if ("defaultCommentProfileId" in body) {
    const id = body.defaultCommentProfileId
    if (id === null) {
      data.defaultCommentProfileId = null
    } else if (typeof id === "string") {
      // Must be a profile this user can actually select, or the Home screen
      // would preselect something it cannot load.
      const profile = await db.commentProfile.findFirst({
        where: { id, OR: [{ isSystem: true }, { userId: user.id }] },
        select: { id: true },
      })
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 })
      }
      data.defaultCommentProfileId = id
    } else {
      return NextResponse.json({ error: "defaultCommentProfileId must be a string or null" }, { status: 400 })
    }
  }

  if ("defaultLanguage" in body) {
    const language = body.defaultLanguage
    if (language === null) {
      data.defaultLanguage = null
    } else if (typeof language === "string" && LANGUAGES.includes(language)) {
      data.defaultLanguage = language
    } else {
      return NextResponse.json(
        { error: `defaultLanguage must be null or one of: ${LANGUAGES.join(", ")}` },
        { status: 400 },
      )
    }
  }

  if ("insertWarningHidden" in body) {
    if (typeof body.insertWarningHidden !== "boolean") {
      return NextResponse.json({ error: "insertWarningHidden must be a boolean" }, { status: 400 })
    }
    data.insertWarningHidden = body.insertWarningHidden
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No recognised settings in request" }, { status: 400 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data,
    select: {
      defaultCommentProfileId: true,
      defaultLanguage: true,
      insertWarningHidden: true,
    },
  })

  return NextResponse.json(updated)
}
