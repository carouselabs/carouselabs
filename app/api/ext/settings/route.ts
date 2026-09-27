// app/api/ext/settings/route.ts — the extension's account settings, for the
// side panel and the website's Extension section (either caller: see
// getExtensionUser).
//
// Everything the extension lets a user edit lives here or in its own route
// (profiles, contacts), so the website can edit it too. That includes what
// used to be kept only in one browser — the connection note's context and
// length, the user's own LinkedIn profile, and whether the Insert button
// shows (lib/extensionPreferences.ts validates those).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { Prisma } from "@prisma/client"
import {
  parseConnectNoteContext,
  parseConnectNoteLength,
  parseLinkedinProfile,
} from "@/lib/extensionPreferences"

// Mirrors the language list the profile builder offers.
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Hindi"]

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  return NextResponse.json({
    defaultCommentProfileId: user.defaultCommentProfileId,
    defaultConnectionProfileId: user.defaultConnectionProfileId,
    defaultMessageProfileId: user.defaultMessageProfileId,
    defaultLanguage: user.defaultLanguage,
    insertWarningHidden: user.insertWarningHidden,
    connectNoteContext: user.connectNoteContext,
    connectNoteLength: user.connectNoteLength,
    linkedinProfile: user.linkedinProfile,
    insertButtonHidden: user.insertButtonHidden,
  })
}

// PATCH — every field is optional, so the client can send just what changed.
// Written as a named allowlist rather than spreading the body, so a future
// User column cannot be set from the extension by accident.
export async function PATCH(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const data: {
    defaultCommentProfileId?: string | null
    defaultConnectionProfileId?: string | null
    defaultMessageProfileId?: string | null
    defaultLanguage?: string | null
    insertWarningHidden?: boolean
    connectNoteContext?: Prisma.InputJsonValue | typeof Prisma.DbNull
    connectNoteLength?: Prisma.InputJsonValue | typeof Prisma.DbNull
    linkedinProfile?: Prisma.InputJsonValue | typeof Prisma.DbNull
    insertButtonHidden?: boolean | null
  } = {}

  // The JSON settings share one shape of handling: validate, then store the
  // cleaned value, or a database NULL when cleared.
  const jsonSettings = [
    ["connectNoteContext", parseConnectNoteContext],
    ["connectNoteLength", parseConnectNoteLength],
    ["linkedinProfile", parseLinkedinProfile],
  ] as const
  for (const [key, parse] of jsonSettings) {
    if (!(key in body)) continue
    const parsed = parse(body[key])
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    data[key] = parsed.value === null ? Prisma.DbNull : (parsed.value as unknown as Prisma.InputJsonValue)
  }

  if ("insertButtonHidden" in body) {
    if (body.insertButtonHidden !== null && typeof body.insertButtonHidden !== "boolean") {
      return NextResponse.json({ error: "insertButtonHidden must be a boolean or null" }, { status: 400 })
    }
    data.insertButtonHidden = body.insertButtonHidden as boolean | null
  }

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

  // Same rule as the comment default above, against the connection profiles.
  if ("defaultConnectionProfileId" in body) {
    const id = body.defaultConnectionProfileId
    if (id === null) {
      data.defaultConnectionProfileId = null
    } else if (typeof id === "string") {
      const profile = await db.connectionProfile.findFirst({
        where: { id, OR: [{ isSystem: true }, { userId: user.id }] },
        select: { id: true },
      })
      if (!profile) {
        return NextResponse.json({ error: "Connection profile not found" }, { status: 404 })
      }
      data.defaultConnectionProfileId = id
    } else {
      return NextResponse.json({ error: "defaultConnectionProfileId must be a string or null" }, { status: 400 })
    }
  }

  // Same rule as the profiles above, against the message profiles.
  if ("defaultMessageProfileId" in body) {
    const id = body.defaultMessageProfileId
    if (id === null) {
      data.defaultMessageProfileId = null
    } else if (typeof id === "string") {
      const profile = await db.messageProfile.findFirst({
        where: { id, OR: [{ isSystem: true }, { userId: user.id }] },
        select: { id: true },
      })
      if (!profile) {
        return NextResponse.json({ error: "Message profile not found" }, { status: 404 })
      }
      data.defaultMessageProfileId = id
    } else {
      return NextResponse.json({ error: "defaultMessageProfileId must be a string or null" }, { status: 400 })
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
      defaultConnectionProfileId: true,
      defaultMessageProfileId: true,
      defaultLanguage: true,
      insertWarningHidden: true,
      connectNoteContext: true,
      connectNoteLength: true,
      linkedinProfile: true,
      insertButtonHidden: true,
    },
  })

  return NextResponse.json(updated)
}
