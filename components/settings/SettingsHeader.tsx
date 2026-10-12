// components/settings/SettingsHeader.tsx
// The title every Settings page starts with. The tabs (Profile, Voice
// Presets, Billing, Referrals, Start Page, Account) live in the app header's
// second row — see components/shell/nav.ts subNavItems.
export function SettingsHeader() {
  return <h1 className="text-title-sm font-semibold text-foreground">Settings</h1>
}
