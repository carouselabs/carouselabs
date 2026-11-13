// app/(app)/extension/settings/page.tsx — the old Settings address. Its settings now
// live in Plan & setup → Preferences; links from older extension builds and
// bookmarks land there.
import { redirect } from "next/navigation"

export default function ExtensionSettingsPage() {
  redirect("/extension/billing#preferences")
}
