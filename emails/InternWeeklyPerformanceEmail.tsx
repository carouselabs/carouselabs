import * as React from "react"
import { Heading, Text, Section } from "@react-email/components"
import { EMPLOYEE_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"

export type WeeklyPerformanceTone = "top" | "moved_up" | "steady" | "needs_push"

// Everything the template needs to render one intern's personalized weekly
// email. lib/internWeeklyEmail.ts's WeeklyPerformanceData extends this with
// routing-only fields (internId, email) the template itself never touches.
export type WeeklyPerformanceEmailProps = {
  name: string
  weekLabel: string
  activeInternCount: number
  rankThisWeek: number
  pointsThisWeek: number
  rankLastWeek: number | null
  rankDelta: number | null // positive = moved up N spots, negative = dropped N spots, null = no prior-week rank
  presentDays: number
  absentDays: number
  perfectAttendance: boolean
  isHighestPoints: boolean
  isMostImproved: boolean
  tone: WeeklyPerformanceTone
}

function ordinal(n: number): string {
  const rem100 = n % 100
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

function movementLabel({ rankThisWeek, rankLastWeek, rankDelta }: WeeklyPerformanceEmailProps): string {
  if (rankLastWeek === null || rankDelta === null) {
    return `This is your first tracked week — welcome to the board at #${rankThisWeek}!`
  }
  if (rankDelta > 0) {
    return `↑ Moved up ${rankDelta} spot${rankDelta === 1 ? "" : "s"} — from #${rankLastWeek} to #${rankThisWeek}`
  }
  if (rankDelta < 0) {
    const down = Math.abs(rankDelta)
    return `↓ Down ${down} spot${down === 1 ? "" : "s"} — from #${rankLastWeek} to #${rankThisWeek}`
  }
  return `→ Held steady at #${rankThisWeek}`
}

// The one adaptively-toned paragraph — see Step 2 for the rules that pick
// `tone` in lib/internWeeklyEmail.ts. TONE D is deliberately supportive, not
// harsh, and never names or compares against other interns.
function TonedMessage(props: WeeklyPerformanceEmailProps) {
  const { name, tone, rankThisWeek, pointsThisWeek, rankLastWeek, activeInternCount } = props

  if (tone === "top") {
    return (
      <Text style={emailStyles.text}>
        {name}, huge week — you finished {ordinal(rankThisWeek)} out of {activeInternCount} interns with{" "}
        <strong>{pointsThisWeek} points</strong>. That&apos;s top-3 territory. Keep the streak going!
      </Text>
    )
  }
  if (tone === "moved_up") {
    return (
      <Text style={emailStyles.text}>
        {name}, nice climb this week — you went from #{rankLastWeek} to #{rankThisWeek} with{" "}
        <strong>{pointsThisWeek} points</strong>. That kind of progress compounds — keep building on it.
      </Text>
    )
  }
  if (tone === "steady") {
    return (
      <Text style={emailStyles.text}>
        {name}, you held #{rankThisWeek} this week with <strong>{pointsThisWeek} points</strong> — steady and
        reliable. A little extra push this week could move you into the next tier.
      </Text>
    )
  }
  return (
    <Text style={emailStyles.text}>
      {name}, some weeks are busier than others, and that&apos;s completely okay. This week&apos;s a fresh
      start — log a task or two and you&apos;ll be right back in the mix. We&apos;re rooting for you!
    </Text>
  )
}

const CLOSING_LINE: Record<WeeklyPerformanceTone, string> = {
  top: "See you at the top next week!",
  moved_up: "Keep this momentum going into next week.",
  steady: "Small, consistent wins add up — let's build on this next week.",
  needs_push: "Whenever you're ready, we're here — let's make next week a good one.",
}

// Subject is chosen in lib/email.ts (per-tone), based on the same `tone`.
export function InternWeeklyPerformanceEmail(props: WeeklyPerformanceEmailProps) {
  const { name, weekLabel, rankThisWeek, pointsThisWeek, presentDays, absentDays, perfectAttendance, isHighestPoints, isMostImproved, tone } =
    props

  const badges = [
    isHighestPoints && "🏆 Highest points this week",
    perfectAttendance && "✅ Perfect attendance",
    isMostImproved && "📈 Most improved",
  ].filter((b): b is string => !!b)

  return (
    <EmailLayout preview={`Your week: #${rankThisWeek}, ${pointsThisWeek} pts — ${weekLabel}`}>
      <Heading style={emailStyles.heading}>Your week in review</Heading>
      <Text style={emailStyles.text}>Hi {name}, here&apos;s how your week went ({weekLabel}):</Text>

      <Section style={{ padding: "4px 0 12px" }}>
        <Text style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 700, color: "#16161d" }}>
          #{rankThisWeek} · {pointsThisWeek} pts
        </Text>
        <Text style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#454552" }}>{movementLabel(props)}</Text>
      </Section>

      {badges.length > 0 && (
        <Text style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 600, color: "#7C3AED" }}>
          {badges.join("  ·  ")}
        </Text>
      )}

      <TonedMessage {...props} />

      <Text style={emailStyles.text}>
        Attendance this week: <strong>{presentDays} present</strong> / {absentDays} absent
      </Text>

      <Text style={emailStyles.text}>{CLOSING_LINE[tone]}</Text>

      <EmailButton href={`${EMPLOYEE_URL}/intern`}>View Full Leaderboard</EmailButton>
    </EmailLayout>
  )
}
