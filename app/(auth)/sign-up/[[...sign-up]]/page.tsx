import type { Metadata } from "next"
import { cookies } from "next/headers"
import { SignUp } from "@clerk/nextjs"
import { authAppearance } from "@/lib/clerkAppearance"
import { REFERRAL_COOKIE_NAME } from "@/lib/referralConstants"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SignUpPage() {
  // Clerk's webhook (user.created) runs server-to-server and can never see
  // this browser's cookies directly — the only way the referral code
  // reaches it is by attaching it to the SignUp attempt itself here, via
  // unsafeMetadata, which Clerk carries through to the webhook payload's
  // data.unsafe_metadata (confirmed against the installed @clerk/backend
  // types — UserJSON.unsafe_metadata — not assumed). See proxy.ts for where
  // this cookie gets set, and app/api/webhooks/clerk/route.ts for where it's
  // read back out on the other side.
  const referralCode = (await cookies()).get(REFERRAL_COOKIE_NAME)?.value

  return (
    <div className="flex justify-center">
      <SignUp
        appearance={authAppearance}
        unsafeMetadata={referralCode ? { referralCode } : undefined}
      />
    </div>
  )
}
