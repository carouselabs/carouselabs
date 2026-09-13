// app/api/start-page/route.ts — the current user's own Start Page (a simple
// link-in-bio page at carouselabs.com/start/[slug]). One per user.
import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { isValidSlug, isValidTheme } from "@/lib/startPage"

// GET /api/start-page — the current user's Start Page + its links (ordered),
// or { startPage: null } if they haven't created one yet.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const startPage = await db.startPage.findUnique({
    where: { userId: user.id },
    include: { links: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json({ startPage })
}

// POST /api/start-page — create the user's Start Page (one-time; use PATCH
// afterward). Body: { slug, title?, bio?, avatarUrl?, theme? }
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existing = await db.startPage.findUnique({ where: { userId: user.id } })
  if (existing) {
    return NextResponse.json({ error: "You already have a Start Page — use PATCH to update it" }, { status: 400 })
  }

  let slug: string
  let title: string | null
  let bio: string | null
  let avatarUrl: string | null
  let theme: string

  try {
    const body = await req.json()
    if (typeof body.slug !== "string" || !isValidSlug(body.slug.toLowerCase())) {
      throw new Error("Slug must be 3-30 lowercase letters, numbers, or hyphens")
    }
    slug = body.slug.toLowerCase()
    title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 100) : null
    bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim().slice(0, 500) : null
    avatarUrl = typeof body.avatarUrl === "string" && body.avatarUrl.trim() ? body.avatarUrl.trim() : null
    theme = isValidTheme(body.theme) ? body.theme : "default"
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  const slugTaken = await db.startPage.findUnique({ where: { slug } })
  if (slugTaken) {
    return NextResponse.json({ error: "That slug is already taken" }, { status: 409 })
  }

  const startPage = await db.startPage.create({
    data: { userId: user.id, slug, title, bio, avatarUrl, theme },
    include: { links: true },
  })

  return NextResponse.json({ startPage })
}

// PATCH /api/start-page — update the user's existing Start Page. Body: any
// subset of { slug, title, bio, avatarUrl, theme }.
export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const existing = await db.startPage.findUnique({ where: { userId: user.id } })
  if (!existing) return NextResponse.json({ error: "No Start Page yet — create one first" }, { status: 404 })

  const data: {
    slug?: string
    title?: string | null
    bio?: string | null
    avatarUrl?: string | null
    theme?: string
  } = {}

  try {
    const body = await req.json()
    if (body.slug !== undefined) {
      if (typeof body.slug !== "string" || !isValidSlug(body.slug.toLowerCase())) {
        throw new Error("Slug must be 3-30 lowercase letters, numbers, or hyphens")
      }
      data.slug = body.slug.toLowerCase()
    }
    if (body.title !== undefined) {
      data.title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 100) : null
    }
    if (body.bio !== undefined) {
      data.bio = typeof body.bio === "string" && body.bio.trim() ? body.bio.trim().slice(0, 500) : null
    }
    if (body.avatarUrl !== undefined) {
      data.avatarUrl =
        typeof body.avatarUrl === "string" && body.avatarUrl.trim() ? body.avatarUrl.trim() : null
    }
    if (body.theme !== undefined) {
      if (!isValidTheme(body.theme)) throw new Error("Invalid theme")
      data.theme = body.theme
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request body" },
      { status: 400 },
    )
  }

  if (data.slug && data.slug !== existing.slug) {
    const slugTaken = await db.startPage.findUnique({ where: { slug: data.slug } })
    if (slugTaken) return NextResponse.json({ error: "That slug is already taken" }, { status: 409 })
  }

  const startPage = await db.startPage.update({
    where: { userId: user.id },
    data,
    include: { links: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json({ startPage })
}
