import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

export type DailySummaryTask = { name: string; points: number }

// Subject: "Your summary for [date] 📋"
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
    <EmailLayout
      preview={`Your summary for ${date} — ${pointsToday >= 0 ? "+" : ""}${pointsToday} pts today`}
    >
      <Heading style={emailStyles.heading}>Your summary for {date}</Heading>
      <Text style={emailStyles.text}>
        Hi {name}, here&apos;s your summary for {date}:
      </Text>

      {hasTasks ? (
        <ul style={emailStyles.list}>
          {tasksCompleted.map((task, i) => (
            <li key={i}>
              {task.name} — {task.points >= 0 ? "+" : ""}
              {task.points} pts
            </li>
          ))}
        </ul>
      ) : (
        <Text style={emailStyles.text}>No tasks logged today.</Text>
      )}

      <Text style={emailStyles.text}>
        Points earned today:{" "}
        <strong>
          {pointsToday >= 0 ? "+" : ""}
          {pointsToday}
        </strong>
        <br />
        All-time total: <strong>{totalPoints} pts</strong>
      </Text>

      <Text style={emailStyles.text}>
        {hasTasks ? "Great work today!" : "Let's aim to log some tasks tomorrow!"}
      </Text>

      <EmailButton href={`${APP_URL}/intern`}>View Your Portal</EmailButton>
    </EmailLayout>
  )
}
