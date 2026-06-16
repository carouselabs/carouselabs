import { SignUp } from "@clerk/nextjs"
import { authAppearance } from "@/lib/clerkAppearance"

export default function SignUpPage() {
  return (
    <div className="flex justify-center">
      <SignUp appearance={authAppearance} />
    </div>
  )
}
