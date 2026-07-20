// /admin/broadcasts — compose and send email broadcasts to users.
import { BroadcastComposer } from "@/components/admin/BroadcastComposer"

export const dynamic = "force-dynamic"

export default function AdminBroadcastsPage() {
  return <BroadcastComposer />
}
