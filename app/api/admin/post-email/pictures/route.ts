// POST /api/admin/post-email/pictures { email } → { built } — makes (or finds,
// when made before) the pictures a shared-post email needs that inboxes can't
// build themselves: the banner with the photo over it, a photo grid, a video
// cover, a slideshow (lib/postEmailPictures.tsx). The admin's preview shows
// them as soon as they're made, so only the parts they're made from are
// read: a draft whose words aren't finished still gets its pictures.
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAdminUser, adminForbidden } from "@/lib/adminAuth"
import { newPostEmail, postEmailSchema, type PostEmail } from "@/lib/postEmail"
import { PostEmailError, buildPostPictures, postPicturesProblem } from "@/lib/postEmailPictures"

export const maxDuration = 60

const post = postEmailSchema.shape.post
const body = z.object({
  email: z.object({
    post: post.pick({ type: true, author: true, photos: true, video: true, slides: true }),
    built: postEmailSchema.shape.built,
  }),
})

export async function POST(req: Request) {
  const admin = await getAdminUser()
  if (!admin) return adminForbidden()
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "This email can't be read" }, { status: 400 })
  const blank = newPostEmail("2000-01-01")
  const email: PostEmail = { ...blank, post: { ...blank.post, ...parsed.data.email.post }, built: parsed.data.email.built }
  const problem = postPicturesProblem(email)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  try {
    return NextResponse.json({ built: await buildPostPictures(email) })
  } catch (err) {
    if (err instanceof PostEmailError) return NextResponse.json({ error: err.message }, { status: err.status })
    throw err
  }
}
