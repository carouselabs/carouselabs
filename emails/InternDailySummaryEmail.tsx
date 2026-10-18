import * as React from "react"
import { Column, Row, Text } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailFacts, EmailLayout, EmailPanel, emailStyles } from "./EmailLayout"
import { EMAIL_COLORS } from "./theme"

export type DailySummaryTask = { name: string; points: number }

const signed = (n: number) => `${n >= 0 ? "+" : ""}${n}`

// Subject: "Your summary for [date]"
export function InternDailySummaryEmail({
  name,
  date,
  tasksCompleted,
  pointsToday,
  totalPoints,
}: {
  name: string
  date: string
  tasksCompleted: DailySummaryTask[]
  pointsToday: number
  totalPoints: number
}) {
  const hasTasks = tasksCompleted.length > 0

  return (
    <EmailLayout audience="intern" hero="daily" preview={`Your summary for ${date}: ${signed(pointsToday)} pts today`}>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>Here&apos;s how {date} went.</Text>
      <Text style={emailStyles.label}>Logged today</Text>
      {hasTasks ? (
        <EmailPanel>
          {tasksCompleted.map((task, i) => (
            <Row key={i} style={{ borderTop: i === 0 ? "none" : `1px solid ${EMAIL_COLORS.line}` }}>
              <Column style={{ padding: "10px 12px 10px 0", fontSize: "15px", lineHeight: "1.45", color: EMAIL_COLORS.ink }}>{task.name}</Column>
              <Column align="right" style={{ padding: "10px 0", fontSize: "14px", fontWeight: 600, color: EMAIL_COLORS.violet, whiteSpace: "nowrap" }}>
                {signed(task.points)} pts
              </Column>
            </Row>
          ))}
        </EmailPanel>
      ) : (
        <Text style={{ ...emailStyles.text, color: EMAIL_COLORS.muted }}>No tasks were logged today.</Text>
      )}
      <EmailFacts
        items={[
          ["Points today", signed(pointsToday)],
          ["All-time total", `${totalPoints} pts`],
        ]}
      />
      <Text style={emailStyles.text}>{hasTasks ? "Good work today. See you tomorrow." : "Let's log a few tasks tomorrow."}</Text>
      <EmailButton href={EMPLOYEE_URL}>Open your portal</EmailButton>
    </EmailLayout>
  )
}
