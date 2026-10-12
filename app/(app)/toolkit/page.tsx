import type { Metadata } from "next"
import { getCurrentUser } from "@/lib/auth"
import { extAccessSummary } from "@/lib/extAccess"
import { ToolkitView } from "@/components/toolkit/ToolkitView"

export const metadata: Metadata = {
  title: "Toolkit",
  description: "Every CarouseLabs tool and browser extension in one place.",
}

export default async function ToolkitPage() {
  // The (app) layout has already required a signed-in user.
  const user = await getCurrentUser()
  const [extension, xExtension] = user
    ? await Promise.all([extAccessSummary(user.id), extAccessSummary(user.id, "x")])
    : [null, null]
  const unlimited = { linkedin: extension?.access === "unlimited", x: xExtension?.access === "unlimited" }

  return <ToolkitView unlimited={unlimited} />
}
