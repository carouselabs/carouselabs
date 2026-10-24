// /api/unsubscribe/[token] — PUBLIC (see proxy.ts). The Unsubscribe link at
// the bottom of every email a lead gets (lib/leadUnsubscribe.ts).
//   GET   → a page asking them to confirm (opening the link changes nothing,
//           so a mail scanner that opens every link can't unsubscribe anyone)
//   POST  → unsubscribes them: from that page's button (answers with a page
//           saying it's done), or from their inbox's own Unsubscribe button
//           (RFC 8058 one-click, answers 200)
import { APP_URL, EMAIL_COLORS, EMAIL_IMAGES, SANS, SERIF } from "@/emails/theme"
import { readUnsubscribeToken } from "@/lib/leadUnsubscribe"
import { unsubscribeLead } from "@/lib/leads"

const c = EMAIL_COLORS

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · CarouseLabs</title>
<style>
  body { margin: 0; padding: 48px 16px; background: ${c.page}; font-family: ${SANS}; color: ${c.body}; }
  main { max-width: 480px; margin: 0 auto; background: ${c.card}; border: 1px solid ${c.line}; border-radius: 18px; padding: 32px 28px; }
  h1 { margin: 24px 0 10px; font-family: ${SERIF}; font-size: 28px; font-weight: 400; line-height: 1.2; color: ${c.ink}; }
  p { margin: 0 0 18px; font-size: 16px; line-height: 1.6; }
  button { border: 0; border-radius: 999px; padding: 12px 22px; background: ${c.ink}; color: #fff; font: 600 15px ${SANS}; cursor: pointer; }
  a { color: ${c.muted}; }
  .small { margin: 18px 0 0; font-size: 13px; color: ${c.muted}; }
</style>
</head>
<body>
<main>
<a href="${APP_URL}"><img src="${EMAIL_IMAGES}/logo.png" width="168" height="30" alt="CarouseLabs"></a>
<h1>${title}</h1>
${body}
</main>
</body>
</html>`
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } })
}

const notOurs = () => page("This link doesn't work", "<p>It may have been copied only in part. Open the Unsubscribe link from the email again.</p>", 404)
const unavailable = () => page("Something went wrong", "<p>We couldn't do that just now. Please try the link again in a few minutes.</p>", 503)

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!readUnsubscribeToken((await params).token)) return notOurs()
  return page(
    "Unsubscribe?",
    `<p>We'll stop emailing you. You can still use CarouseLabs any time.</p>
<form method="post"><input type="hidden" name="confirm" value="1"><button type="submit">Unsubscribe</button></form>`,
  )
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const leadId = readUnsubscribeToken((await params).token)
  const form = await req.formData().catch(() => null)
  const fromPage = form?.get("confirm") === "1"
  if (!leadId) return fromPage ? notOurs() : new Response("Not found", { status: 404 })
  try {
    // A lead deleted since then gets nothing more either way.
    await unsubscribeLead(leadId)
  } catch (err) {
    console.error("[unsubscribe] failed:", err instanceof Error ? err.message : err)
    return fromPage ? unavailable() : new Response("Try again later", { status: 503 })
  }
  if (!fromPage) return new Response("Unsubscribed", { status: 200 })
  return page("You're unsubscribed", `<p>You won't get any more emails from us.</p><p class="small"><a href="${APP_URL}">carouselabs.com</a></p>`)
}
