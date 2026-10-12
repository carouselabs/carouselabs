import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import ExtensionConnectPage from "@/app/extension-connect/page"

// Development-only: the real hand-off page without signing in. Signed out,
// the token exchange answers 401, so this shows the error state. Signed in,
// it would mint a real extension token — so it refuses to run then.
export default async function ExtensionConnectPreview() {
  if (process.env.NODE_ENV !== "development") notFound()
  const { userId } = await auth()
  if (userId) {
    return (
      <p className="p-8 font-sans text-[#211F1C]">
        Preview disabled while signed in: it would connect a real extension. Open it in a private window.
      </p>
    )
  }
  return <ExtensionConnectPage />
}
