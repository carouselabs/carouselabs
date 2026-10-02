// POST /api/ext/errors — the side panel reports an error the server can't
// see on its own (an Insert that couldn't find LinkedIn's box, a conversation
// that couldn't be read, a request that never arrived). Feeds the admin's
// Engage error figures.
//
// Metadata only, by design: feature, a short code and message, the extension
// version. Never post, comment or message text — the message is length-capped
// and the panel sends its own fixed wording, not page content.
import { NextResponse } from "next/server"
import { z } from "zod"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { db } from "@/lib/db"
import { getUserFromCommentExtensionToken, VERSION_HEADER } from "@/lib/extensionCommentAuth"

const limiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  prefix: "ext-errors",
  analytics: false,
})

const body = z.object({
  feature: z.enum(["comments", "replies", "connection_notes", "messages", "insert", "read", "auth", "other"]),
  code: z.string().regex(/^[a-z0-9_.-]{1,48}$/),
  message: z.string().trim().min(1).max(300),
})

export async function POST(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })

  // Over the limit: accepted and dropped. A panel stuck in an error loop
  // shouldn't fill the table, and shouldn't be told to retry either.
  const { success } = await limiter.limit(`user:${user.id}`)
  if (!success) return new NextResponse(null, { status: 204 })

  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid error report" }, { status: 400 })

  const version = req.headers.get(VERSION_HEADER)?.trim().slice(0, 20) || null
  await db.engageClientError
    .create({ data: { userId: user.id, ...parsed.data, extensionVersion: version } })
    .catch((err) => console.error("[ext/errors] could not store a report:", err))

  return new NextResponse(null, { status: 204 })
}
