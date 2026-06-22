// app/api/contact/route.ts
import { NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// Spam guard for this unauthenticated endpoint: 3 messages/hour per IP.
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: false,
})

const SUPPORT_EMAIL = "support@carouselabs.com"
const FROM = "CarouseLabs <support@carouselabs.com>"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function POST(req: Request) {
  // Rate limit by client IP (best-effort: trusts the proxy-set forwarding header).
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  const { success } = await ratelimit.limit(`contact:${ip}`)
  if (!success) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 },
    )
  }

  let body: { name?: string; email?: string; subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const name = body.name?.trim()
  const email = body.email?.trim()
  const subject = body.subject?.trim()
  const message = body.message?.trim()

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
  }

  try {
    // Resend returns { data, error } — it does not throw on API errors, so we
    // check `error` explicitly.
    const { error } = await resend.emails.send({
      from: FROM,
      to: SUPPORT_EMAIL,
      replyTo: email,
      subject: `[CarouseLabs Contact] ${subject} from ${name}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
      `,
    })

    if (error) {
      console.error("[api/contact] Resend error:", error)
      return NextResponse.json({ error: "Failed to send message" }, { status: 502 })
    }
  } catch (err) {
    console.error("[api/contact] error:", err)
    return NextResponse.json({ error: "Failed to send message" }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
