// POST /api/email-track/human/[token]?to=… — PUBLIC (see proxy.ts). The
// click page's script (app/api/email-track/click) calls this as it forwards:
// a real browser made the click, so it counts (unless it's still plainly a
// scanner: lib/emailScanners.ts). Recorded after the response.
import { after } from "next/server"
import { clickDestination, readTrackingToken, recordEmailEvent, visitInfo } from "@/lib/emailTracking"

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const email = readTrackingToken((await params).token)
  const link = clickDestination(new URL(req.url).searchParams.get("to"))
  const visit = visitInfo(req)
  if (email && link) after(() => recordEmailEvent(email, { type: "human", link, visit }))
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
}
