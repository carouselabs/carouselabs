// GET /api/admin/posts — all generated posts, server-side filtered/paginated.
// Query: page (1-based), type (CAROUSEL|SINGLE_IMAGE|TEXT_ONLY), from, to
// (YYYY-MM-DD), search (matches user email or idea hook/title).
import { NextResponse } from "next/server"
import type { Prisma, PostFormat } from "@prisma/client"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { postCreditCost } from "@/lib/adminStats"

const PAGE_SIZE = 20
const FORMATS: PostFormat[] = ["CAROUSEL", "SINGLE_IMAGE", "TEXT_ONLY"]

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const sp = new URL(req.url).searchParams
  const page = Math.max(1, Number(sp.get("page")) || 1)
  const type = sp.get("type")
  const search = sp.get("search")?.trim()
  const from = sp.get("from")
  const to = sp.get("to")

  const where: Prisma.PostWhereInput = {}
  if (type && FORMATS.includes(type as PostFormat)) where.format = type as PostFormat
  if (from || to) {
    where.createdAt = {}
    if (from && !isNaN(Date.parse(from))) where.createdAt.gte = new Date(from)
    if (to && !isNaN(Date.parse(to))) {
      const end = new Date(to)
      end.setDate(end.getDate() + 1) // inclusive end date
      where.createdAt.lt = end
    }
  }
  if (search) {
    where.OR = [
      { user: { email: { contains: search, mode: "insensitive" } } },
      { idea: { hook: { contains: search, mode: "insensitive" } } },
      { idea: { title: { contains: search, mode: "insensitive" } } },
      { title: { contains: search, mode: "insensitive" } },
    ]
  }

  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, email: true } },
        idea: { select: { hook: true, title: true } },
      },
    }),
  ])

  return NextResponse.json({
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    posts: posts.map((p) => ({
      id: p.id,
      userId: p.user.id,
      email: p.user.email,
      title: p.title,
      format: p.format,
      status: p.status,
      ideaHook: p.idea?.hook ?? p.idea?.title ?? null,
      creditsCost: postCreditCost(p.format),
      createdAt: p.createdAt,
    })),
  })
}
