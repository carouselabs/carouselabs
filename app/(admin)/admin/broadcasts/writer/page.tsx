// /admin/broadcasts/writer — write an email with AI, with a picture and
// stickers painted for it, then send it as a campaign.
import { EmailWriter } from "@/components/admin/EmailWriter"

export const dynamic = "force-dynamic"

export default function AdminEmailWriterPage() {
  return <EmailWriter />
}
