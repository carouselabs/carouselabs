import * as React from "react"
import { Text } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"

// Subject: "Attendance notice — [date]"
export function InternAbsentWarningEmail({
  name,
  date,
  presentDays,
  absentDays,
  attendanceRate,
}: {
  name: string
  date: string
  presentDays: number
  absentDays: number
  attendanceRate: number
}) {
  return (
    <EmailLayout audience="intern" hero="attendance" preview={`You were marked absent on ${date}. Here's your attendance so far.`}>
      <Text style={emailStyles.text}>Hi {name},</Text>
      <Text style={emailStyles.text}>
        You were marked absent on <strong style={emailStyles.strong}>{date}</strong>.
      </Text>
      <Text style={emailStyles.text}>
        Regular attendance is part of how your internship is evaluated, so please be present and on time going forward. If
        you can&apos;t make it on a given day, let your admin know in advance.
      </Text>
      <EmailFacts
        items={[
          ["Days present", presentDays],
          ["Days absent", absentDays],
          ["Attendance rate", `${attendanceRate}%`],
        ]}
      />
      <EmailButton href={EMPLOYEE_URL}>Review your record</EmailButton>
      <Text style={emailStyles.muted}>Think this is a mistake? Message the team from Support in your portal.</Text>
    </EmailLayout>
  )
}
