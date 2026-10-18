import * as React from "react"
import { Text, Section, Hr } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"
import { EMAIL_COLORS } from "./theme"

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

const FLAG_BACKGROUND: Record<InternDigestRow["flag"], string> = {
  good: "#E3F4EC",
  warning: "#FBEEDC",
  critical: "#FBE5E5",
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
    <EmailLayout audience="admin" hero="digest" preview={`Weekly intern summary for the week of ${weekLabel}`}>
      <Text style={emailStyles.text}>
        Here&apos;s how your {interns.length} active intern{interns.length === 1 ? "" : "s"} did for the week
        of {weekLabel}. Interns needing attention are listed first.
      </Text>
      {interns.map((i, idx) => (
        <React.Fragment key={i.id}>
          <Section style={{ padding: "12px 0" }}>
            <Text style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: EMAIL_COLORS.ink }}>
              {i.name}
              {i.role ? ` · ${i.role}` : ""}{" "}
              <span
                style={{
                  color: FLAG_COLOR[i.flag],
                  backgroundColor: FLAG_BACKGROUND[i.flag],
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {FLAG_LABEL[i.flag].toUpperCase()}
              </span>
            </Text>
            <Text style={{ margin: 0, fontSize: "13px", lineHeight: "1.6", color: EMAIL_COLORS.body }}>
              {i.pointsThisWeek >= 0 ? "+" : ""}
              {i.pointsThisWeek} pts this week · {i.present} present / {i.absent} absent / {i.halfDay} half-day
              / {i.leave} leave
              {i.newNotes > 0 ? ` · ${i.newNotes} new note${i.newNotes === 1 ? "" : "s"}` : ""}
            </Text>
          </Section>
          {idx < interns.length - 1 && <Hr style={{ borderColor: EMAIL_COLORS.line, margin: 0 }} />}
        </React.Fragment>
      ))}
      <div style={{ marginTop: "20px" }}>
        <EmailButton href={`${APP_URL}/admin/interns`}>View the full roster</EmailButton>
      </div>
    </EmailLayout>
  )
}
