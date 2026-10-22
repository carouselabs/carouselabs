// GET /api/email-track/click/[token]?to=… — PUBLIC (see proxy.ts). Every
// link in a tracked email points here (lib/emailTracking.ts): the click is
// recorded after the response and they go straight on to the link. Only
// places our emails may link to are followed; anything else goes to the
// home page, so this can't be used to send people elsewhere.
import { NextResponse, after } from "next/server"
import { APP_URL } from "@/emails/theme"
import { clickDestination, readTrackingToken, recordEmailEvent } from "@/lib/emailTracking"

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const destination = clickDestination(new URL(req.url).searchParams.get("to"))
  const email = readTrackingToken((await params).token)
  if (email && destination) after(() => recordEmailEvent(email, "click"))
  return NextResponse.redirect(destination ?? APP_URL, 302)
}
