// app/(app)/extension/layout.tsx — the website's home for the two Engage
// extensions: CarouseLabs Engage for LinkedIn (/extension/*) and for X
// (/extension/x/*), each with its install steps, voice profiles, history,
// settings, plan and payments; the header switches between them. Nothing
// here generates text; generation only happens in the extensions.
import type { ReactNode } from "react"
import type { Metadata } from "next"
import { ExtensionTabs } from "@/components/extension/ExtensionTabs"

export const metadata: Metadata = {
  title: "Engage for LinkedIn",
  description: "Your CarouseLabs Engage for LinkedIn extension: install it, voice profiles, history, settings and plan.",
}

export default function ExtensionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8">
      <ExtensionTabs />
      {children}
    </div>
  )
}
