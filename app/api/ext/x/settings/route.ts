// app/api/ext/x/settings/route.ts — CarouseLabs Engage for X's account
// settings (XUserSettings), for the X panel and the website (either caller:
// see getExtensionUser). No row yet means the defaults.
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { clampReplyLength } from "@/lib/xProfiles"
import { X_MAX_LENGTH } from "@/lib/xText"

const DEFAULTS = { defaultProfileId: null as string | null, maxReplyLength: X_MAX_LENGTH, insertButtonHidden: false }

function shape(row: typeof DEFAULTS | null) {
  return {
    defaultProfileId: row?.defaultProfileId ?? null,
    maxReplyLength: row?.maxReplyLength ?? X_MAX_LENGTH,
    insertButtonHidden: row?.insertButtonHidden ?? false,
  }
}

const SELECT = { defaultProfileId: true, maxReplyLength: true, insertButtonHidden: true } as const

export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  const row = await db.xUserSettings.findUnique({ where: { userId: user.id }, select: SELECT })
  return NextResponse.json(shape(row))
}

// PATCH — any of defaultProfileId (an X profile you can use, or null),
// maxReplyLength (280 up to X Premium's), insertButtonHidden.
export async function PATCH(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 })

  const data: Partial<typeof DEFAULTS> = {}

  if ("defaultProfileId" in body) {
    const id = body.defaultProfileId
    if (id === null) data.defaultProfileId = null
    else if (typeof id === "string") {
      const usable = await db.xProfile.findFirst({
        where: { id, OR: [{ isSystem: true }, { userId: user.id }] },
        select: { id: true },
      })
      if (!usable) return NextResponse.json({ error: "X profile not found" }, { status: 404 })
      data.defaultProfileId = id
    } else return NextResponse.json({ error: "defaultProfileId must be a profile id or null" }, { status: 400 })
  }

  if ("maxReplyLength" in body) {
    if (typeof body.maxReplyLength !== "number") {
      return NextResponse.json({ error: "maxReplyLength must be a number" }, { status: 400 })
    }
    data.maxReplyLength = clampReplyLength(body.maxReplyLength)
  }

  if ("insertButtonHidden" in body) {
    if (typeof body.insertButtonHidden !== "boolean") {
      return NextResponse.json({ error: "insertButtonHidden must be a boolean" }, { status: 400 })
    }
    data.insertButtonHidden = body.insertButtonHidden
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No recognised settings in request" }, { status: 400 })
  }

  const row = await db.xUserSettings.upsert({
    where: { userId: user.id },
    create: { ...DEFAULTS, ...data, userId: user.id },
    update: data,
    select: SELECT,
  })
  return NextResponse.json(shape(row))
}
