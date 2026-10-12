import { redirect } from "next/navigation"

// /settings lands on the first tab. The tab bar lives on each settings page
// (Profile / Voice Presets / Account) via <SettingsHeader />.
export default function SettingsPage() {
  redirect("/settings/profile")
}
