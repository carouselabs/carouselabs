// /admin/broadcasts/ready — fixed emails sent as they are, as campaigns
// (components/admin/ReadyEmails.tsx, lib/readyEmails.ts).
import { ReadyEmails } from "@/components/admin/ReadyEmails"

export const dynamic = "force-dynamic"

export default function AdminReadyEmailsPage() {
  return <ReadyEmails />
}
