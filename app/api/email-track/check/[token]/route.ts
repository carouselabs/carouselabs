// GET /api/email-track/check/[token] — PUBLIC (see proxy.ts). The hidden
// link at the top of every tracked email (lib/emailTracking.ts withTracking):
// people can't see or reach it, so whatever visits it is a robot (a company's
// security scanner), and so is anything else from the same source around
// then (lib/emailScanners.ts). Recorded after the response.
import { after } from "next/server"
import { readTrackingToken, recordEmailEvent, visitInfo } from "@/lib/emailTracking"

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const email = readTrackingToken((await params).token)
  const visit = visitInfo(req)
  if (email) after(() => recordEmailEvent(email, { type: "trap", visit }))
  return new Response("OK", { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } })
}

export const HEAD = GET
