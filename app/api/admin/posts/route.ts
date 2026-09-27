// GET /api/admin/posts — everything users make, newest first, for the
// /admin/posts gallery: website posts (Post) and the LinkedIn extension's
// generations (CommentHistory) merged into one feed.
// Query: type (a PostFormat | EXTENSION | ext:<kind>), from, to (YYYY-MM-DD),
// search (user email, title/hook, caption or generated text), and the cursor
// pa/pi (posts) + ea/ei (extension) from the previous page's `next`.
//
// Paging is by cursor, one per source, because the two tables can't share an
// offset: each page takes the newest PAGE_SIZE from both, merges them, and
// keeps the first PAGE_SIZE. Each source's cursor then points at its last
// item that was sent, so nothing is skipped or repeated, even when many rows
// share a createdAt (bulk uploads create posts in one statement).
import { NextResponse } from "next/server"
import type { Prisma, PostFormat } from "@prisma/client"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { db } from "@/lib/db"
import { postCreditCost } from "@/lib/adminStats"
import {
  EXTENSION_FILTER,
  EXTENSION_KIND_LABELS,
  EXTENSION_KIND_PREFIX,
  POST_FORMAT_LABELS,
  type AdminCreation,
  type AdminCreationsCursor,
  type AdminCreationsResponse,
} from "@/lib/adminCreations"

const PAGE_SIZE = 24
const FORMATS: PostFormat[] = ["CAROUSEL", "SINGLE_IMAGE", "TEXT_ONLY", "THUMBNAIL", "CUSTOM"]
const KINDS = Object.keys(EXTENSION_KIND_LABELS)

// Rows strictly after (at, id) in newest-first order.
function after(at: string | null, id: string | null) {
  if (!at || !id || isNaN(Date.parse(at))) return null
  const date = new Date(at)
  return { OR: [{ createdAt: { lt: date } }, { createdAt: date, id: { lt: id } }] }
}

function dateRange(from: string | null, to: string | null) {
  if (!from && !to) return null
  const range: { gte?: Date; lt?: Date } = {}
  if (from && !isNaN(Date.parse(from))) range.gte = new Date(from)
  if (to && !isNaN(Date.parse(to))) {
    const end = new Date(to)
    end.setDate(end.getDate() + 1) // inclusive end date
    range.lt = end
  }
  return range
}

export async function GET(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()

  const sp = new URL(req.url).searchParams
  const type = sp.get("type") ?? ""
  const search = sp.get("search")?.trim()
  const createdAt = dateRange(sp.get("from"), sp.get("to"))
  const postAfter = after(sp.get("pa"), sp.get("pi"))
  const extAfter = after(sp.get("ea"), sp.get("ei"))
  const firstPage = !sp.get("pa") && !sp.get("ea")

  // Which sources the type filter keeps.
  const postFormat = FORMATS.find((f) => f === type)
  const extKind = type.startsWith(EXTENSION_KIND_PREFIX) ? type.slice(EXTENSION_KIND_PREFIX.length) : null
  const wantPosts = !type || Boolean(postFormat)
  const wantExt = !type || type === EXTENSION_FILTER || (extKind !== null && KINDS.includes(extKind))

  const postWhere: Prisma.PostWhereInput = {}
  if (postFormat) postWhere.format = postFormat
  if (createdAt) postWhere.createdAt = createdAt
  if (search) {
    postWhere.OR = [
      { user: { email: { contains: search, mode: "insensitive" } } },
      { idea: { hook: { contains: search, mode: "insensitive" } } },
      { idea: { title: { contains: search, mode: "insensitive" } } },
      { title: { contains: search, mode: "insensitive" } },
      { caption: { contains: search, mode: "insensitive" } },
    ]
  }

  const extWhere: Prisma.CommentHistoryWhereInput = {}
  if (extKind) extWhere.kind = extKind
  if (createdAt) extWhere.createdAt = createdAt
  if (search) {
    extWhere.OR = [
      { user: { email: { contains: search, mode: "insensitive" } } },
      { postAuthor: { contains: search, mode: "insensitive" } },
      { comment: { contains: search, mode: "insensitive" } },
    ]
  }

  const newestFirst = [{ createdAt: "desc" as const }, { id: "desc" as const }]
  const [postTotal, extTotal, posts, exts] = await Promise.all([
    wantPosts && firstPage ? db.post.count({ where: postWhere }) : 0,
    wantExt && firstPage ? db.commentHistory.count({ where: extWhere }) : 0,
    wantPosts
      ? db.post.findMany({
          where: postAfter ? { AND: [postWhere, postAfter] } : postWhere,
          orderBy: newestFirst,
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            caption: true,
            format: true,
            status: true,
            imageUrls: true,
            metadata: true,
            createdAt: true,
            user: { select: { id: true, email: true } },
            idea: { select: { hook: true, title: true } },
          },
        })
      : [],
    wantExt
      ? db.commentHistory.findMany({
          where: extAfter ? { AND: [extWhere, extAfter] } : extWhere,
          orderBy: newestFirst,
          take: PAGE_SIZE,
          select: {
            id: true,
            kind: true,
            profileName: true,
            postAuthor: true,
            postUrl: true,
            postSnippet: true,
            comment: true,
            createdAt: true,
            user: { select: { id: true, email: true } },
          },
        })
      : [],
  ])

  const postItems: AdminCreation[] = posts.map((p) => {
    const brief = (p.metadata as { videoContent?: unknown } | null)?.videoContent
    return {
      source: "post",
      id: p.id,
      userId: p.user.id,
      email: p.user.email,
      type: p.format,
      typeLabel: POST_FORMAT_LABELS[p.format] ?? p.format,
      title: p.title || p.idea?.hook || p.idea?.title || "Untitled",
      text: p.caption ?? (typeof brief === "string" && brief ? brief : null),
      context: null,
      images: p.imageUrls.filter(Boolean),
      status: p.status,
      profileName: null,
      linkUrl: null,
      credits: postCreditCost(p.format),
      createdAt: p.createdAt.toISOString(),
    }
  })

  const extItems: AdminCreation[] = exts.map((h) => {
    const label = EXTENSION_KIND_LABELS[h.kind] ?? h.kind
    return {
      source: "extension",
      id: h.id,
      userId: h.user.id,
      email: h.user.email,
      type: h.kind,
      typeLabel: label,
      title: h.postAuthor ? `${label} for ${h.postAuthor}` : label,
      text: h.comment,
      context: h.postSnippet || null,
      images: [],
      status: null,
      profileName: h.profileName,
      linkUrl: h.postUrl || null,
      credits: null,
      createdAt: h.createdAt.toISOString(),
    }
  })

  // Merge the two newest-first lists without re-sorting either, so what's
  // sent from each source is always a prefix of it in the database's own
  // order, the order its cursor continues from. (ISO timestamps compare
  // correctly as strings.)
  const items: AdminCreation[] = []
  let pi = 0
  let ei = 0
  while (items.length < PAGE_SIZE && (pi < postItems.length || ei < extItems.length)) {
    const post = postItems[pi]
    const ext = extItems[ei]
    if (!ext || (post && post.createdAt >= ext.createdAt)) {
      items.push(post)
      pi++
    } else {
      items.push(ext)
      ei++
    }
  }

  const lastPost = pi > 0 ? postItems[pi - 1] : undefined
  const lastExt = ei > 0 ? extItems[ei - 1] : undefined
  const more =
    pi < postItems.length || ei < extItems.length || posts.length === PAGE_SIZE || exts.length === PAGE_SIZE

  const next: AdminCreationsCursor | null = more
    ? {
        pa: lastPost?.createdAt ?? sp.get("pa"),
        pi: lastPost?.id ?? sp.get("pi"),
        ea: lastExt?.createdAt ?? sp.get("ea"),
        ei: lastExt?.id ?? sp.get("ei"),
      }
    : null

  const body: AdminCreationsResponse = {
    total: firstPage ? postTotal + extTotal : null,
    items,
    next,
  }
  return NextResponse.json(body)
}
