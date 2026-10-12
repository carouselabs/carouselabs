import { redirect } from "next/navigation"

// /settings lands on the first tab. The tab bar lives on each settings page
// (Profile / Voice Presets / Account) via <SettingsTabs />.
export default function SettingsPage() {
  redirect("/settings/profile")
}
