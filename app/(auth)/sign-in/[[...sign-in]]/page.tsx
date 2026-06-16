import { SignIn } from "@clerk/nextjs"
import { authAppearance } from "@/lib/clerkAppearance"

export default function SignInPage() {
  return (
    <div className="flex justify-center">
      <SignIn appearance={authAppearance} />
    </div>
  )
}
