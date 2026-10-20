// /admin/users/[userId]/email — write a personal email to this one person
// with the AI email writer (it's told their account facts), and send it.
import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { EmailWriter } from "@/components/admin/EmailWriter"

export const dynamic = "force-dynamic"

export default async function AdminUserEmailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, deletedAt: true, profile: { select: { name: true } } },
  })
  if (!user || user.deletedAt) notFound()
  const name = user.profile?.name?.trim() || null
  const firstName = (name ?? user.email.split("@")[0]).split(/\s+/)[0]
  return <EmailWriter recipient={{ id: user.id, email: user.email, name, firstName }} />
}
