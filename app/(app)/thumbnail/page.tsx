import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ThumbnailClient } from "./_client"

export default async function ThumbnailPage() {
  const { userId } = await auth()
  if (!userId) redirect("/sign-in")

  return <ThumbnailClient />
}
