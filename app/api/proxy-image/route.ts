import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const imageUrl = url.searchParams.get("url")

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }

  // Only allow images served from our R2 public bucket. Compare full URL
  // origins (not a string prefix) so a host like "<r2-host>.attacker.com" can't
  // satisfy the check and turn this into an SSRF / open proxy. Any malformed
  // URL (or unset env var) throws and fails closed with a 400.
  try {
    const allowedOrigin = new URL(process.env.CLOUDFLARE_R2_PUBLIC_URL!).origin
    const requestedOrigin = new URL(imageUrl).origin
    if (requestedOrigin !== allowedOrigin) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 })
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
