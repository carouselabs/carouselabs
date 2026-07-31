import type { Metadata } from "next"
import { SignIn } from "@clerk/nextjs"
import { authAppearance } from "@/lib/clerkAppearance"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <SignIn appearance={authAppearance} />
    </div>
  )
}
