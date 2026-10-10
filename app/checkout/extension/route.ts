// app/checkout/extension/route.ts — every "Get the extension — $15/month"
// button on the website points here (EXTENSION_CHECKOUT_PATH).
//
//   signed out  → /sign-up, which returns here once the account exists, so
//                 the payment is always tied to an account
//   signed in   → the Lemon Squeezy checkout, stamped with the account's id
//                 (lib/extensionCheckout.ts)
//   subscribed  → the Lemon Squeezy portal, never a second subscription
//
// ?platform=x is CarouseLabs Engage for X, sold separately
// (X_EXTENSION_CHECKOUT_PATH); without it, the LinkedIn extension.
//
// Deliberately outside the (app) group: that layout sends new accounts
// through onboarding first, which would lose the checkout on the way.
// Public in proxy.ts so this handler, not Clerk, decides where a signed-out
// visitor goes (sign-up rather than sign-in).
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getCurrentUser } from "@/lib/auth"
import { extensionCheckoutFor } from "@/lib/extensionCheckout"
import { EXTENSION_CHECKOUT_PATH, X_EXTENSION_CHECKOUT_PATH } from "@/lib/plans"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const platform = new URL(req.url).searchParams.get("platform") === "x" ? "x" : "linkedin"
  const { userId } = await auth()
  if (!userId) {
    const signUp = new URL("/sign-up", req.url)
    signUp.searchParams.set(
      "redirect_url",
      new URL(platform === "x" ? X_EXTENSION_CHECKOUT_PATH : EXTENSION_CHECKOUT_PATH, req.url).toString(),
    )
    return NextResponse.redirect(signUp)
  }

  // Creates the account row if Clerk's webhook hasn't landed yet, which is
  // likely straight after sign-up.
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/sign-in", req.url))

  const checkout = await extensionCheckoutFor(user, platform)
  if (checkout.kind === "checkout") return NextResponse.redirect(checkout.url, 303)
  if (checkout.kind === "subscribed" && checkout.manageUrl) return NextResponse.redirect(checkout.manageUrl, 303)
  // Already subscribed without a portal link, or checkout not configured:
  // the extension's plan page explains either case.
  return NextResponse.redirect(new URL(platform === "x" ? "/extension/x/billing" : "/extension/billing", req.url), 303)
}
