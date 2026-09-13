import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/content-hub/queue/shuffle — randomizes which currently-queued
// (not yet published), future-dated post lands in which of the queue slot
// times it and its siblings currently occupy. This is a permutation of the
// existing scheduledFor timestamps among themselves — not a fresh
// slot-assignment run — so every post still lands on a legitimate queue slot
// occurrence, nothing is skipped/dropped, and nothing needs a queue slot
// re-lookup.
//
// Scoped per platform: slot times are platform-specific (see
// prisma/schema.prisma's QueueSlot), so shuffling across platforms could
// otherwise put a LinkedIn post at a time meant for Instagram.
export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const queued = await db.scheduledPost.findMany({
    where: { userId: user.id, status: "queued", scheduledFor: { gt: new Date() } },
    select: { id: true, platform: true, scheduledFor: true },
  })

  const byPlatform = new Map<string, typeof queued>()
  for (const item of queued) {
    const list = byPlatform.get(item.platform) ?? []
    list.push(item)
    byPlatform.set(item.platform, list)
  }

  const updates: { id: string; scheduledFor: Date }[] = []
  for (const items of byPlatform.values()) {
    if (items.length < 2) continue // nothing to shuffle with 0-1 posts

    const times = items.map((i) => i.scheduledFor)
    for (let i = times.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[times[i], times[j]] = [times[j], times[i]]
    }
    items.forEach((item, idx) => updates.push({ id: item.id, scheduledFor: times[idx] }))
  }

  if (updates.length > 0) {
    await db.$transaction(
      updates.map((u) => db.scheduledPost.update({ where: { id: u.id }, data: { scheduledFor: u.scheduledFor } })),
    )
  }

  return NextResponse.json({ shuffled: updates.length })
}
