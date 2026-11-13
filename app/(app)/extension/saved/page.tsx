// app/(app)/extension/saved/page.tsx — Engage → Saved comments (LinkedIn):
// the comments LinkedIn's side panel inserts in one click. The list is loaded
// here, on the server, so the page arrives filled in.
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { SAVED_COMMENT_ORDER, savedCommentForClient } from "@/lib/engageSavedComments"
import { isEngageSchemaMissing } from "@/lib/engage/schemaMissing"
import { SavedCommentsManager } from "@/components/extension/SavedCommentsManager"

export default async function ExtensionSavedCommentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/sign-in")

  // The table comes from scripts/engage-saved-comments.sql: until that runs,
  // an empty list rather than a broken page.
  const rows = await db.engageSavedComment
    .findMany({ where: { userId: user.id, platform: "linkedin" }, orderBy: SAVED_COMMENT_ORDER })
    .catch((err) => {
      if (isEngageSchemaMissing(err)) return []
      throw err
    })

  return <SavedCommentsManager initial={rows.map(savedCommentForClient)} />
}
