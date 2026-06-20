import { auth } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { db } from "@/lib/db"
import { postToLinkedIn } from "@/lib/linkedin"

const MAX_IMAGES = 8

// Publishes a caption + image(s) to the current user's connected LinkedIn account.
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { clerkId: userId },
    include: { linkedIn: true },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = (await req.json().catch(() => ({}))) as {
    caption?: string
    imageUrls?: string[]
  }
  const caption = typeof body.caption === "string" ? body.caption : ""
  const imageUrls = Array.isArray(body.imageUrls)
    ? body.imageUrls.filter((u): u is string => typeof u === "string" && u.length > 0)
    : []

  if (!user.linkedIn) {
    return NextResponse.json({ error: "LinkedIn not connected" }, { status: 400 })
  }

  if (
    user.linkedIn.expiresAt &&
    user.linkedIn.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "LinkedIn connection expired, please reconnect" },
      { status: 401 },
    )
  }

  if (!caption && imageUrls.length === 0) {
    return NextResponse.json(
      { error: "Nothing to post — provide a caption or at least one image" },
      { status: 400 },
    )
  }

  if (imageUrls.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `LinkedIn supports up to ${MAX_IMAGES} images per post` },
      { status: 400 },
    )
  }

  try {
    const { postUrl } = await postToLinkedIn(
      user.linkedIn.accessToken,
      user.linkedIn.linkedInId,
      caption,
      imageUrls,
    )
    return NextResponse.json({ success: true, postUrl })
  } catch (err) {
    console.error("[linkedin/post]", err)
    return NextResponse.json(
      { error: "Failed to post to LinkedIn. Please try again." },
      { status: 502 },
    )
  }
}
