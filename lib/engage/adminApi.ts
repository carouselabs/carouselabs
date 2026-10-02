// lib/engage/adminApi.ts — small helpers shared by the /api/admin/engage
// routes: body parsing with a readable 400, and the target user lookup.
import { NextResponse } from "next/server"
import type { z } from "zod"
import { db } from "@/lib/db"

export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ ok: true; data: z.infer<T> } | { ok: false; response: NextResponse }> {
  const raw = await req.json().catch(() => undefined)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const where = first?.path.length ? `${first.path.join(".")}: ` : ""
    return {
      ok: false,
      response: NextResponse.json({ error: `${where}${first?.message ?? "Invalid request"}` }, { status: 400 }),
    }
  }
  return { ok: true, data: parsed.data }
}

export async function findTargetUser(userId: string) {
  return db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, deletedAt: true } })
}

export const notFound = () => NextResponse.json({ error: "User not found" }, { status: 404 })
