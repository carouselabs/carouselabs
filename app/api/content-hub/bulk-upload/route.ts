// app/api/content-hub/bulk-upload/route.ts — CSV bulk import. The client
// parses the CSV and sends already-split rows (see lib/csv.ts and
// components/content-hub/BulkUploadPanel.tsx, which chunks a large file into
// several requests so progress can be shown and no single request runs too
// long). Each row becomes a real Post (format: CUSTOM, no AI, no credit
// charge) + one ScheduledPost, exactly like a single Custom Post — this is
// just a faster way to create many of them. Rows are processed independently
// and best-effort: one bad row never aborts the rest.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidPlatform, isFunctionalPlatform, type Platform } from "@/lib/platforms"
import { nextAvailableQueueSlot } from "@/lib/queue"
import { reuploadExternalImage } from "@/lib/externalImage"

export const maxDuration = 300

const MAX_ROWS_PER_REQUEST = 25

interface RawRow {
  caption?: unknown
  imageUrl?: unknown
  platform?: unknown
  scheduledFor?: unknown
}

interface RowResult {
  row: number
  ok: boolean
  postId?: string
  error?: string
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let rows: RawRow[]
  let timeZone = "UTC"

  try {
    const body = await req.json()
    if (!Array.isArray(body.rows) || body.rows.length === 0) throw new Error("No rows provided")
    if (body.rows.length > MAX_ROWS_PER_REQUEST) {
      throw new Error(`At most ${MAX_ROWS_PER_REQUEST} rows per request`)
    }
    rows = body.rows
    if (typeof body.timeZone === "string" && body.timeZone) {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: body.timeZone })
        timeZone = body.timeZone
      } catch {
        timeZone = "UTC"
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const results: RowResult[] = []

  // Sequential, not Promise.all — each row may re-host an image (a real
  // network call), and staying sequential keeps behavior predictable and
  // avoids hammering R2/the target hosts with a burst of concurrent fetches
  // for what's already an admin-style bulk operation, not a latency-sensitive one.
  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    try {
      const caption = typeof raw.caption === "string" ? raw.caption.trim() : ""
      const platform: string = typeof raw.platform === "string" ? raw.platform.trim().toLowerCase() : ""
      if (!isValidPlatform(platform)) throw new Error(`Unsupported platform "${raw.platform}"`)

      const rawImageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : ""
      let imageUrls: string[] = []
      if (rawImageUrl) {
        const url = await reuploadExternalImage(rawImageUrl, user.id, "bulk-upload")
        imageUrls = [url]
      }

      if (!caption && imageUrls.length === 0) throw new Error("Needs a caption or an imageUrl")

      const scheduledForRaw = typeof raw.scheduledFor === "string" ? raw.scheduledFor.trim() : "queue"
      let scheduledFor: Date | null
      if (!scheduledForRaw || scheduledForRaw.toLowerCase() === "queue") {
        scheduledFor = await nextAvailableQueueSlot(user.id, platform, timeZone)
        if (!scheduledFor) throw new Error(`No active queue slots for ${platform}`)
      } else {
        const parsed = new Date(scheduledForRaw)
        if (isNaN(parsed.getTime())) throw new Error(`Invalid scheduledFor "${scheduledForRaw}"`)
        scheduledFor = parsed
      }

      if (platform === "linkedin") {
        const linkedIn = await db.linkedInAccount.findUnique({ where: { userId: user.id } })
        if (!linkedIn) throw new Error("LinkedIn isn't connected yet")
      }
      const effectiveStatus = isFunctionalPlatform(platform as Platform) ? "queued" : "pending_connection"

      const post = await db.post.create({
        data: {
          userId: user.id,
          title: caption ? caption.slice(0, 80) : "Bulk import",
          caption: caption || null,
          format: "CUSTOM",
          status: "READY",
          imageUrls,
          r2Keys: [],
        },
      })

      await db.scheduledPost.create({
        data: { userId: user.id, postId: post.id, platform, scheduledFor, status: effectiveStatus },
      })

      results.push({ row: i, ok: true, postId: post.id })
    } catch (err) {
      results.push({ row: i, ok: false, error: err instanceof Error ? err.message : "Failed" })
    }
  }

  return NextResponse.json({ results })
}
