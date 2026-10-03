// app/(app)/extension/x/page.tsx — Extension → X (Twitter): CarouseLabs
// Engage for X's reply profiles, history and settings.
import type { Metadata } from "next"
import { XExtensionManager } from "@/components/extension/XExtensionManager"

export const metadata: Metadata = {
  title: "X Extension",
  description: "Your CarouseLabs Engage for X extension: reply profiles, history and settings.",
}

export default function ExtensionXPage() {
  return <XExtensionManager />
}
