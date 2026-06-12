import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const imageUrl = url.searchParams.get("url")

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  // Only allow R2 public URLs for security
  const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL ?? ""
  if (!R2_PUBLIC_URL || !imageUrl.startsWith(R2_PUBLIC_URL)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 403 })
  }

  try {
    const res = await fetch(imageUrl)
    if (!res.ok) throw new Error("Failed to fetch image")

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to proxy image" }, { status: 502 })
  }
}
