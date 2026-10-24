"use client"

// /admin/broadcasts/ready — ready-made emails (lib/readyEmails.ts): fixed
// emails sent as they are. Each shows as people get it (with an example
// name); "Use this email" picks who gets it and who it's from, and makes a
// campaign (UseAgainDialog) where it's sent a batch at a time.
import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Send } from "lucide-react"
import { AdminButton, AdminCard } from "@/components/admin/ui"
import { personalizePreview, READY_EMAILS, readyEmailHtml, withReplyLink, type ReadyEmail } from "@/lib/readyEmails"
import { DEFAULT_SENDER, fromHeader } from "@/lib/sendingRules"
import { UseAgainDialog } from "./UseAgainDialog"

const EXAMPLE_NAME = "Priya"

function Preview({ email }: { email: ReadyEmail }) {
  const [height, setHeight] = useState(900)
  const html = personalizePreview(withReplyLink(readyEmailHtml(email), DEFAULT_SENDER.email, email.subject), EXAMPLE_NAME)
  return (
    <iframe
      title={`${email.name} preview`}
      srcDoc={html}
      onLoad={(e) => {
        // Same page, so its height can be read: the whole email shows, no inner scrolling.
        try {
          const body = e.currentTarget.contentDocument?.body
          if (body) setHeight(Math.ceil(body.getBoundingClientRect().height) + 4)
        } catch {}
      }}
      style={{ height }}
      className="block w-full rounded-control-sm border border-border bg-white"
    />
  )
}

export function ReadyEmails() {
  const [using, setUsing] = useState<ReadyEmail | null>(null)
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/broadcasts" className="inline-flex w-fit items-center gap-1.5 text-caption text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden />
        Broadcasts
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-title-sm font-semibold text-foreground">Ready-made emails</h1>
        <p className="max-w-[70ch] text-label text-muted-foreground">
          Fixed emails, sent exactly as they are. Pick one, choose who gets it (a leads list, a smart list, or addresses you type in) and the
          address it comes from. It becomes a campaign: nothing goes out until you tick people and press Send there. Each person&apos;s first
          name is filled in, and leads get an Unsubscribe link.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {READY_EMAILS.map((email) => (
          <AdminCard
            key={email.id}
            title={email.name}
            actions={
              <AdminButton onClick={() => setUsing(email)}>
                <Send aria-hidden />
                Use this email
              </AdminButton>
            }
          >
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 text-caption">
                <dt className="text-muted-foreground">Subject</dt>
                <dd className="min-w-0 font-semibold text-foreground">{email.subject}</dd>
                <dt className="text-muted-foreground">From</dt>
                <dd className="min-w-0 break-words text-foreground">
                  {fromHeader({ name: email.fromName, email: DEFAULT_SENDER.email })}
                  <span className="text-muted-foreground"> (or the address you pick)</span>
                </dd>
              </dl>
              <Preview email={email} />
              <p className="text-caption text-muted-foreground">Shown with the example name {EXAMPLE_NAME}. The button opens a reply to the sender.</p>
            </div>
          </AdminCard>
        ))}
      </div>

      {using && <UseAgainDialog source={`ready:${using.id}`} subject={using.subject} title="Send this email" onClose={() => setUsing(null)} />}
    </div>
  )
}
