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
  timeout: 3000,
})

const SUPPORT_EMAIL = "support@carouselabs.com"
const FROM = "CarouseLabs <support@carouselabs.com>"

// Bound the body while reading it; Content-Length is client controlled and
// cannot protect against chunked uploads. Parsing finishes before email work.
async function readContactBody(req: Request): Promise<unknown> {
  const reader = req.body?.getReader()
  if (!reader) throw new Error("Missing request body")
  const chunks: Uint8Array[] = []
  let size = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Request body timed out")), 10_000)
  })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), expired])
      if (done) break
      size += value.byteLength
      if (size > 64 * 1024) throw new Error("Request body too large")
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } finally {
    clearTimeout(timer)
    void reader.cancel().catch(() => {})
  }
}

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
  let allowed: boolean
  try {
    const result = await ratelimit.limit(`contact:${ip}`)
    // Upstash returns success:true on timeout by default. Sending paid email
    // requires an actual limit decision, even during a Redis outage.
    if (result.reason === "timeout") throw new Error("Rate limit unavailable")
    allowed = result.success
  } catch {
    return NextResponse.json({ error: "Contact form temporarily unavailable. Please try again later." }, { status: 503 })
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many messages. Please try again later." },
      { status: 429 },
    )
  }

  let body: Record<string, unknown>
  try {
    const input = await readContactBody(req)
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid request")
    body = input as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const email = typeof body.email === "string" ? body.email.trim() : ""
  const subject = typeof body.subject === "string" ? body.subject.trim() : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }
  if (name.length > 100 || email.length > 254 || subject.length > 200 || message.length > 10_000 ||
      /[\r\n]/.test(name) || /[\r\n]/.test(subject)) {
    return NextResponse.json({ error: "Use a name under 101 characters, a subject under 201 characters, and a message under 10,001 characters." }, { status: 400 })
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
      console.error("[api/contact] Email provider rejected delivery")
      return NextResponse.json({ error: "Failed to send message" }, { status: 502 })
    }
  } catch {
    console.error("[api/contact] Email delivery failed")
    return NextResponse.json({ error: "Failed to send message" }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
