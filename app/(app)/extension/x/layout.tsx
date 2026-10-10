// app/(app)/extension/x/layout.tsx — CarouseLabs Engage for X's pages, under
// the Extension section's header (app/(app)/extension/layout.tsx), which
// switches between the two extensions.
import type { ReactNode } from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Engage for X",
  description: "Your CarouseLabs Engage for X extension: install it, plan, reply profiles, history and settings.",
}

export default function ExtensionXLayout({ children }: { children: ReactNode }) {
  return children
}
