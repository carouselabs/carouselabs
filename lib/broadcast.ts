// lib/broadcast.ts
// Server-only recipient resolution (touches Prisma) for admin email
// broadcasts. Rendering lives in lib/broadcastRender.ts, which has no
// server-only imports so the client-side preview modal can use it too.
import { db } from "@/lib/db"

export type BroadcastRecipients = "all" | "pro" | "growth" | "free" | string[]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function resolveRecipients(recipients: BroadcastRecipients): Promise<string[]> {
  if (Array.isArray(recipients)) {
    const cleaned = recipients
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_RE.test(e))
    return [...new Set(cleaned)]
  }

  if (recipients === "all") {
    const users = await db.user.findMany({ where: { deletedAt: null }, select: { email: true } })
    return users.map((u) => u.email)
  }

  const plan = recipients === "pro" ? "PRO" : recipients === "growth" ? "GROWTH" : "FREE"
  const users = await db.user.findMany({
    where: { deletedAt: null, subscription: { plan } },
    select: { email: true },
  })
  return users.map((u) => u.email)
}

export { renderBroadcastBodyHtml, renderBroadcastEmailHtml } from "@/lib/broadcastRender"
