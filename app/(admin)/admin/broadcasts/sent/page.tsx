// /admin/broadcasts/sent — every email sent, to use again: templates,
// campaigns and personal emails (components/admin/SentEmailsLibrary.tsx).
import { SentEmailsLibrary } from "@/components/admin/SentEmailsLibrary"

export const dynamic = "force-dynamic"

export default function AdminSentEmailsPage() {
  return <SentEmailsLibrary />
}
