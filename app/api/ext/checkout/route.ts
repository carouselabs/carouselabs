// app/api/ext/checkout/route.ts — the Lemon Squeezy checkout link for the
// extension's $15/month subscription, opened in a new tab by the side panel.
// Built server-side (lib/extensionCheckout.ts) so it carries the signed-in
// user's id, which is how the payment finds the right account.
import { NextResponse } from "next/server"
import { getUserFromCommentExtensionToken } from "@/lib/extensionCommentAuth"
import { extensionCheckoutFor } from "@/lib/extensionCheckout"

// GET /api/ext/checkout → { url } or, when already subscribed, { alreadySubscribed, manageUrl }
export async function GET(req: Request) {
  const user = await getUserFromCommentExtensionToken(req)
  if (!user) {
    return NextResponse.json({ error: "Invalid or missing extension token" }, { status: 401 })
  }

  const checkout = await extensionCheckoutFor(user)
  if (checkout.kind === "subscribed") {
    return NextResponse.json({ alreadySubscribed: true, manageUrl: checkout.manageUrl })
  }
  if (checkout.kind === "unavailable") {
    return NextResponse.json({ error: "Checkout isn't available right now. Please try again later." }, { status: 503 })
  }
  return NextResponse.json({ url: checkout.url })
}
