// /admin/broadcasts/writer — write an email with AI, with a picture and
// stickers painted for it, then send it as a campaign.
import { EmailWriter } from "@/components/admin/EmailWriter"

export const dynamic = "force-dynamic"

// ?reuse=campaign:<id>|personal:<id>|template:<id> opens an email sent before
// (Broadcasts → Sent emails → Use again → Edit first).
export default async function AdminEmailWriterPage({ searchParams }: { searchParams: Promise<{ reuse?: string }> }) {
  const { reuse } = await searchParams
  return <EmailWriter reuse={reuse} />
}
