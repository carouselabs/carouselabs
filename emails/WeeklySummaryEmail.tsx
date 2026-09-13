import * as React from "react"
import { Heading, Text, Link } from "@react-email/components"
import { APP_URL, EmailButton, EmailLayout, emailStyles } from "./EmailLayout"
import { PLATFORM_META, isValidPlatform } from "@/lib/platforms"

function platformLabel(platform: string): string {
  return isValidPlatform(platform) ? PLATFORM_META[platform].label : platform
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export interface WeeklySummaryEmailPost {
  id: string
  title: string
  platform: string
  publishedUrl: string | null
}

function PostRow({ post }: { post: WeeklySummaryEmailPost }) {
  const label = `${post.title} — ${platformLabel(post.platform)}`
  return (
    <Text style={{ margin: "0 0 8px", fontSize: "14px", lineHeight: "1.5", color: "#454552" }}>
      {post.publishedUrl ? (
        <Link href={post.publishedUrl} style={{ color: "#7C3AED", textDecoration: "none" }}>
          {label}
        </Link>
      ) : (
        label
      )}
    </Text>
  )
}

function MoreLine({ shown, total }: { shown: number; total: number }) {
  const remaining = total - shown
  if (remaining <= 0) return null
  return (
    <Text style={{ margin: "0 0 8px", fontSize: "13px", color: "#8a8a99" }}>
      +{remaining} more
    </Text>
  )
}

// Subject: "Your CarouseLabs week in review"
export function WeeklySummaryEmail({
  name,
  publishedPosts,
  publishedCount,
  upcomingPosts,
  upcomingCount,
  referralPending,
  referralPaid,
  hasReferralActivity,
  creditsRemaining,
  plan,
}: {
  name?: string
  publishedPosts: WeeklySummaryEmailPost[]
  publishedCount: number
  upcomingPosts: WeeklySummaryEmailPost[]
  upcomingCount: number
  referralPending: number
  referralPaid: number
  hasReferralActivity: boolean
  creditsRemaining: number
  plan: "FREE" | "PRO" | "GROWTH"
}) {
  const greeting = name?.trim() ? name : "there"
  const planLabel = plan === "GROWTH" ? "Growth" : plan === "PRO" ? "Pro" : "Free"

  return (
    <EmailLayout preview="Your week in review — what published, what's coming up, and more.">
      <Heading style={emailStyles.heading}>Your week in review</Heading>
      <Text style={emailStyles.text}>Hi {greeting}, here&apos;s what happened on CarouseLabs this week.</Text>

      <Text style={{ margin: "20px 0 8px", fontSize: "13px", fontWeight: 700, color: "#16161d" }}>
        This Week
      </Text>
      {publishedCount === 0 ? (
        <Text style={emailStyles.muted}>No posts published this week.</Text>
      ) : (
        <>
          <Text style={emailStyles.text}>
            {publishedCount} post{publishedCount === 1 ? "" : "s"} published:
          </Text>
          {publishedPosts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
          <MoreLine shown={publishedPosts.length} total={publishedCount} />
        </>
      )}

      <Text style={{ margin: "20px 0 8px", fontSize: "13px", fontWeight: 700, color: "#16161d" }}>
        Coming Up
      </Text>
      {upcomingCount === 0 ? (
        <Text style={emailStyles.muted}>Nothing scheduled for the next 7 days yet.</Text>
      ) : (
        <>
          <Text style={emailStyles.text}>
            {upcomingCount} post{upcomingCount === 1 ? "" : "s"} scheduled for the next 7 days:
          </Text>
          {upcomingPosts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
          <MoreLine shown={upcomingPosts.length} total={upcomingCount} />
        </>
      )}

      {hasReferralActivity && (
        <>
          <Text style={{ margin: "20px 0 8px", fontSize: "13px", fontWeight: 700, color: "#16161d" }}>
            Referral Earnings
          </Text>
          <Text style={emailStyles.text}>
            {referralPending > 0 && <>{formatMoney(referralPending)} pending this month</>}
            {referralPending > 0 && referralPaid > 0 && " · "}
            {referralPaid > 0 && <>{formatMoney(referralPaid)} paid this month</>}
          </Text>
        </>
      )}

      <Text style={{ margin: "20px 0 8px", fontSize: "13px", fontWeight: 700, color: "#16161d" }}>
        Your Plan
      </Text>
      <Text style={emailStyles.text}>
        {planLabel} plan · {creditsRemaining} credit{creditsRemaining === 1 ? "" : "s"} remaining
      </Text>

      <div style={{ marginTop: "12px" }}>
        <EmailButton href={`${APP_URL}/content-hub`}>Open Content Hub</EmailButton>
      </div>

      <Text style={emailStyles.muted}>
        Have a great week! You can turn these off anytime in Settings &gt; Account &gt; Notifications.
      </Text>
    </EmailLayout>
  )
}
