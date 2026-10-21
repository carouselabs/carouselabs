// app/(app)/extension/profiles/page.tsx — Extension → Custom tones.
// Everything the page shows is loaded here, on the server, in one go: the
// three kinds' profiles, the note settings and the remembered conversations.
// It used to fetch them in the browser one after another once the page's
// code had loaded, which made it slow to appear and slow to switch tabs.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { ProfilesManager, type ProfilesInitial } from "@/components/extension/ProfilesManager"
import {
  asJson,
  extensionSettingsOf,
  listCommentProfiles,
  listConnectionProfiles,
  listContacts,
  listMessageProfiles,
} from "@/lib/extensionData"

export default async function ExtensionProfilesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  const [comment, connection, message, contacts] = await Promise.all([
    listCommentProfiles(user.id),
    listConnectionProfiles(user.id),
    listMessageProfiles(user.id),
    listContacts(user.id),
  ])

  return (
    <ProfilesManager
      initial={asJson<ProfilesInitial>({
        settings: extensionSettingsOf(user),
        lists: { comment: { profiles: comment }, connection: { profiles: connection }, message: { profiles: message } },
        contacts,
      })}
    />
  )
}
