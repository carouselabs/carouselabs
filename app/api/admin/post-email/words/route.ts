// POST /api/admin/post-email/words { email, goal } → { words } — "Write with
// AI": the subject, preview line, intro, outro and button around a shared
// post, for what the email is for (lib/ai/postEmailAi.ts). The post's own
// words are never changed.
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { PostEmailAiError, writePostEmailWords } from "@/lib/ai/postEmailAi"
import { postEmailSchema } from "@/lib/postEmail"

export const maxDuration = 120

const body = z.object({ email: postEmailSchema, goal: z.string().trim().max(600) })

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "This email can't be read" }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "The AI isn't set up here (ANTHROPIC_API_KEY)." }, { status: 503 })
  try {
    return NextResponse.json({ words: await writePostEmailWords(parsed.data) })
  } catch (err) {
    if (err instanceof PostEmailAiError) return NextResponse.json({ error: err.message }, { status: 422 })
    console.error("[post-email] writing words failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "The AI couldn't write just now. Try again in a minute." }, { status: 502 })
  }
}
