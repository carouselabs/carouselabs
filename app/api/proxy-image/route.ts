import { NextResponse } from "next/server"
import { fetchPublicImage, isSafeExternalUrl } from "@/lib/safeRemoteImage"
import { getCurrentUser } from "@/lib/auth"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const imageUrl = new URL(req.url).searchParams.get("url")
  if (!imageUrl) return NextResponse.json({ error: "Missing url" }, { status: 400 })

  let allowedOrigin: string
  try {
    allowedOrigin = new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL!).origin
    if (!isSafeExternalUrl(imageUrl) || new URL(imageUrl).origin !== allowedOrigin) throw new Error()
  } catch {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
  }

  try {
    // Every redirect must remain on our configured image origin. Images from
    // this bucket are public, but the authenticated proxy response is private.
    const { bytes, mediaType } = await fetchPublicImage(imageUrl, { allowedOrigin })
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mediaType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 502 })
  }
}
