// app/(app)/extension/layout.tsx — the website's home for the LinkedIn
// extension: voice profiles, history, settings, plan and payments. Nothing
// here generates text; generation only happens in the extension, on LinkedIn.
import type { ReactNode } from "react"
import type { Metadata } from "next"
import { ExtensionTabs } from "@/components/extension/ExtensionTabs"

export const metadata: Metadata = {
  title: "LinkedIn Extension",
  description: "Your CarouseLabs Comment extension: voice profiles, history, settings and plan.",
}

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <ExtensionTabs />
      {children}
    </div>
  )
}
