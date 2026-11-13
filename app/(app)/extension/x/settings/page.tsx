// app/(app)/extension/x/settings/page.tsx — the old Settings address. Its settings now
// live in Plan & setup → Preferences; links from older extension builds and
// bookmarks land there.
import { redirect } from "next/navigation"

export default function ExtensionXSettingsPage() {
  redirect("/extension/x/billing#preferences")
}
