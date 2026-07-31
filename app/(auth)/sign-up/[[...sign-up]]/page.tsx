import type { Metadata } from "next"
import { SignUp } from "@clerk/nextjs"
import { authAppearance } from "@/lib/clerkAppearance"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function SignUpPage() {
  return (
    <div className="flex justify-center">
      <SignUp appearance={authAppearance} />
    </div>
  )
}
