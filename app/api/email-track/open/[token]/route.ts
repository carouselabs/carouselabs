// GET /api/email-track/open/[token] — PUBLIC (see proxy.ts). The invisible
// image in a tracked email (lib/emailTracking.ts): loading it marks that
// email as seen, unless it's a security scanner or Apple Mail loading it by
// itself (lib/emailScanners.ts). Always answers with the image, at once,
// whatever the token: it's recorded after the response, and a bad token is
// just ignored.
import { after } from "next/server"
import { readTrackingToken, recordEmailEvent, visitInfo } from "@/lib/emailTracking"

// A 1×1 transparent GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const email = readTrackingToken((await params).token)
  const visit = visitInfo(req)
  if (email) after(() => recordEmailEvent(email, { type: "open", visit }))
  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      // Every load is a fresh request, never a cached copy.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  })
}

// A peek at the image without loading it: a scanner (recorded as one).
export const HEAD = GET
