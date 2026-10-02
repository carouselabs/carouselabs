import { EngageUserDetail } from "@/components/admin/engage/EngageUserDetail"

export default async function EngageUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  return <EngageUserDetail userId={userId} />
}
