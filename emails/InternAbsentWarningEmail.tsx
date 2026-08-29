import * as React from "react"
import { Heading, Text } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

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
    <EmailLayout preview={`You were marked absent on ${date} — please review your attendance record`}>
      <Heading style={emailStyles.heading}>Attendance notice</Heading>
      <Text style={emailStyles.text}>
        Hi {name}, you were marked absent on {date}.
      </Text>
      <Text style={emailStyles.text}>
        Please make sure to be present and on time going forward — consistent attendance is an
        important part of your internship and affects your overall evaluation.
      </Text>
      <ul style={emailStyles.list}>
        <li>Days present: {presentDays}</li>
        <li>Days absent: {absentDays}</li>
        <li>Attendance rate: {attendanceRate}%</li>
      </ul>
      <EmailButton href={EMPLOYEE_URL}>Review Your Record</EmailButton>
    </EmailLayout>
  )
}
