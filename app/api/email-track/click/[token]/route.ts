// GET /api/email-track/click/[token]?to=… — PUBLIC (see proxy.ts). Every
// link in a tracked email points here (lib/emailTracking.ts). The visit is
// recorded (judged: lib/emailScanners.ts) and they go straight on, through a
// tiny page whose script tells us a real browser made the click
// (/api/email-track/human) before forwarding: security scanners that visit
// every link mostly don't run it, so only clicks it confirms count. Without
// scripts, the page still forwards. Only places our emails may link to are
// followed; anything else goes to the home page, so this can't be used to
// send people elsewhere.
import { NextResponse, after } from "next/server"
import { APP_URL } from "@/emails/theme"
import { clickDestination, humanPath, readTrackingToken, recordEmailEvent, visitInfo } from "@/lib/emailTracking"

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
// A value inside the page's script, safe from closing the script tag.
const inScript = (s: string) => JSON.stringify(s).replace(/</g, "\\u003c")

function clickPage(to: string, confirm: string | null): string {
  const href = escapeHtml(to)
  const report = confirm ? `try{navigator.sendBeacon(${inScript(confirm)})}catch(e){}` : ""
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Opening…</title>
<noscript><meta http-equiv="refresh" content="0;url=${href}"></noscript></head>
<body style="margin:0;padding:48px 16px;font:15px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#57524B;background:#F0ECE5">
<p>Opening <a href="${href}" style="color:#211F1C">the link</a>…</p>
<script>${report}location.replace(${inScript(to)})</script>
</body></html>`
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const token = (await params).token
  const destination = clickDestination(new URL(req.url).searchParams.get("to"))
  if (!destination) return NextResponse.redirect(APP_URL, 302)
  const email = readTrackingToken(token)
  const visit = visitInfo(req)
  if (email) after(() => recordEmailEvent(email, { type: "click", link: destination, visit }))
  const headers = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, private" }
  // A peek at the link without opening it: a scanner (recorded as one).
  if (req.method === "HEAD") return new Response(null, { headers })
  return new Response(clickPage(destination, email ? humanPath(token, destination) : null), { headers })
}

export const HEAD = GET
