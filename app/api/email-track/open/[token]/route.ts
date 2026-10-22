// GET /api/email-track/open/[token] — PUBLIC (see proxy.ts). The invisible
// image in a tracked email (lib/emailTracking.ts): loading it marks that
// email as seen. Always answers with the image, at once, whatever the token:
// the count is recorded after the response, and a bad token is just ignored.
import { after } from "next/server"
import { readTrackingToken, recordEmailEvent } from "@/lib/emailTracking"

// A 1×1 transparent GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const email = readTrackingToken((await params).token)
  if (email) after(() => recordEmailEvent(email, "open"))
  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      // Every load is a fresh request, never a cached copy.
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  })
}
