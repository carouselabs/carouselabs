// app/(app)/extension/x/profiles/page.tsx — Extension → Engage for X →
// Reply profiles: X's own voice profiles, apart from LinkedIn's. Loaded on
// the server with X's settings, so the page arrives ready.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { XReplyProfiles, type XProfilesInitial } from "@/components/extension/XExtensionViews"
import { asJson, listXProfiles, loadXSettings } from "@/lib/extensionData"

export default async function ExtensionXProfilesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const [settings, profiles] = await Promise.all([loadXSettings(user.id), listXProfiles(user.id)])

  return (
    <XReplyProfiles
      initial={asJson<XProfilesInitial>({
        settings,
        list: { profiles, defaultProfileId: settings.defaultProfileId },
      })}
    />
  )
}
