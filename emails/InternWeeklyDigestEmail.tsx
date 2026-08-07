import * as React from "react"
import { Heading, Text, Section, Hr } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

export type InternDigestRow = {
  id: string
  name: string
  role: string | null
  pointsThisWeek: number
  present: number
  absent: number
  halfDay: number
  leave: number
  newNotes: number
  flag: "good" | "warning" | "critical"
}

const FLAG_COLOR: Record<InternDigestRow["flag"], string> = {
  good: "#059669",
  warning: "#D97706",
  critical: "#DC2626",
}
const FLAG_LABEL: Record<InternDigestRow["flag"], string> = {
  good: "Good",
  warning: "Warning",
  critical: "Critical",
}

// Subject: "Intern Weekly Digest — [weekLabel]"
export function InternWeeklyDigestEmail({
  weekLabel,
  interns,
}: {
  weekLabel: string
  interns: InternDigestRow[]
}) {
  return (
    <EmailLayout preview={`Weekly intern summary for the week of ${weekLabel}`}>
      <Heading style={emailStyles.heading}>Intern Weekly Digest</Heading>
      <Text style={emailStyles.text}>
        Here&apos;s how your {interns.length} active intern{interns.length === 1 ? "" : "s"} did for the week
        of {weekLabel}. Interns needing attention are listed first.
      </Text>
      {interns.map((i, idx) => (
        <React.Fragment key={i.id}>
          <Section style={{ padding: "12px 0" }}>
            <Text style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#16161d" }}>
              {i.name}
              {i.role ? ` · ${i.role}` : ""}{" "}
              <span style={{ color: FLAG_COLOR[i.flag], fontSize: "12px", fontWeight: 700 }}>
                {FLAG_LABEL[i.flag].toUpperCase()}
              </span>
            </Text>
            <Text style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: "#454552" }}>
              {i.pointsThisWeek >= 0 ? "+" : ""}
              {i.pointsThisWeek} pts this week · {i.present} present / {i.absent} absent / {i.halfDay} half-day
              / {i.leave} leave
              {i.newNotes > 0 ? ` · ${i.newNotes} new note${i.newNotes === 1 ? "" : "s"}` : ""}
            </Text>
          </Section>
          {idx < interns.length - 1 && <Hr style={{ borderColor: "#f0f0f4", margin: 0 }} />}
        </React.Fragment>
      ))}
      <div style={{ marginTop: "20px" }}>
        <EmailButton href={`${APP_URL}/admin/interns`}>View Full Roster</EmailButton>
      </div>
    </EmailLayout>
  )
}
