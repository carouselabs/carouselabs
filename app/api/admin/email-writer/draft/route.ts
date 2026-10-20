// POST /api/admin/email-writer/draft — the AI email writer writes or revises
// an email (lib/ai/emailWriter.ts).
//   body: { request, history: [{ role: "admin"|"writer", text }], current: EmailDesign | null, recipientUserId? }
//   recipientUserId: a personal email to that one person; the writer gets their account facts
//   → { reply, design }   (painted art carried over where the idea didn't change)
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { emailDesignSchema } from "@/lib/emailDesign"
import { artProblem } from "@/lib/emailArtCheck"
import { EmailWriterError, writeEmail } from "@/lib/ai/emailWriter"
import { recipientFacts } from "@/lib/emailRecipientFacts"

export const maxDuration = 240

const body = z.object({
  request: z.string().trim().min(1, "Say what the email should do").max(4000),
  history: z.array(z.object({ role: z.enum(["admin", "writer"]), text: z.string().max(6000) })).max(40),
  current: emailDesignSchema.nullable(),
  recipientUserId: z.string().min(1).max(64).optional(),
})

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 })
  }
  const { request, history, current, recipientUserId } = parsed.data
  if (current && artProblem(current, { painted: false })) {
    return NextResponse.json({ error: "This draft points at a picture that isn't one of ours." }, { status: 400 })
  }
  let about: { facts: string } | undefined
  if (recipientUserId) {
    const person = await recipientFacts(recipientUserId)
    if (!person) return NextResponse.json({ error: "That person's account wasn't found" }, { status: 404 })
    about = { facts: person.text }
  }
  try {
    return NextResponse.json(await writeEmail({ request, history, current, about }))
  } catch (err) {
    if (err instanceof EmailWriterError) return NextResponse.json({ error: err.message }, { status: 502 })
    console.error("[email-writer] draft failed:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "The writer is unavailable right now. Try again in a minute." }, { status: 502 })
  }
}
