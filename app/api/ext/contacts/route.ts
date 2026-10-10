// app/api/ext/contacts/route.ts — the Conversation Assistant's per-person
// memory (model ContactContext): which reason and tone each conversation
// uses. The side panel reads one contact's when a chat is opened and saves
// it on every change; the website's Custom tones → Conversations lists and
// edits them all. Either caller (getExtensionUser).
import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getExtensionUser } from "@/lib/extensionCommentAuth"
import { isContactUrl, parseContactContext } from "@/lib/extensionPreferences"

const LIST_LIMIT = 200

const shape = (row: {
  id: string
  contactUrl: string
  contactName: string
  choice: string
  profileId: string | null
  agentId: string | null
  purpose: string
  tone: string
  updatedAt: Date
}) => ({
  id: row.id,
  contactUrl: row.contactUrl,
  contactName: row.contactName,
  choice: row.choice,
  profileId: row.profileId,
  agentId: row.agentId,
  purpose: row.purpose,
  tone: row.tone,
  updatedAt: row.updatedAt.toISOString(),
})

// GET /api/ext/contacts           → { contacts: [...] }, most recent first
// GET /api/ext/contacts?url=/in/x → { contact: {...} | null }
export async function GET(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const url = new URL(req.url).searchParams.get("url")
  if (url !== null) {
    if (!isContactUrl(url)) return NextResponse.json({ error: "url must be a LinkedIn profile path (/in/…) or an X handle (/x/…)" }, { status: 400 })
    const row = await db.contactContext.findUnique({ where: { userId_contactUrl: { userId: user.id, contactUrl: url } } })
    return NextResponse.json({ contact: row ? shape(row) : null })
  }

  const rows = await db.contactContext.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: LIST_LIMIT,
  })
  return NextResponse.json({ contacts: rows.map(shape) })
}

// PUT /api/ext/contacts — create or replace one contact's setting, keyed by
// contactUrl. An empty contactName keeps the name already stored, so the
// website (or a panel that couldn't read the name) never blanks it.
export async function PUT(req: Request) {
  const user = await getExtensionUser(req)
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }

  const parsed = parseContactContext(await req.json().catch(() => null))
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { contactUrl, contactName, ...fields } = parsed.value
  const row = await db.contactContext.upsert({
    where: { userId_contactUrl: { userId: user.id, contactUrl } },
    create: { userId: user.id, contactUrl, contactName, ...fields },
    update: { ...fields, ...(contactName ? { contactName } : {}) },
  })
  return NextResponse.json({ contact: shape(row) })
}
