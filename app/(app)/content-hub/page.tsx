import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ContentHubClient } from "./_client"

export default async function ContentHubPage({
  searchParams,
}: {
  searchParams: Promise<{ postId?: string; boardItemId?: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  const { postId, boardItemId } = await searchParams

  return <ContentHubClient initialPostId={postId} initialBoardItemId={boardItemId} />
}
