import * as React from "react"
import { Text, Link } from "@react-email/components"
import { APP_URL, EmailButton, EmailFacts, EmailLayout, emailStyles } from "./EmailLayout"
import { EMAIL_COLORS } from "./theme"
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
  return (
    <Text style={{ margin: "0 0 10px", fontSize: "15px", lineHeight: "1.5", color: EMAIL_COLORS.body }}>
      {post.publishedUrl ? (
        <Link href={post.publishedUrl} style={{ ...emailStyles.link, fontWeight: 600 }}>
          {post.title}
        </Link>
      ) : (
        <strong style={emailStyles.strong}>{post.title}</strong>
      )}
      <span style={{ color: EMAIL_COLORS.muted }}> · {platformLabel(post.platform)}</span>
    </Text>
  )
}

function MoreLine({ shown, total }: { shown: number; total: number }) {
  const remaining = total - shown
  if (remaining <= 0) return null
  return <Text style={{ margin: "0 0 10px", fontSize: "13px", color: EMAIL_COLORS.muted }}>+{remaining} more</Text>
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
    <EmailLayout hero="weekly" preview="What went out, what's coming up, and where your plan stands.">
      <Text style={emailStyles.text}>Hi {greeting},</Text>
      <Text style={emailStyles.text}>Here&apos;s your week on CarouseLabs: what went out, what&apos;s coming up, and where your plan stands.</Text>

      <Text style={emailStyles.label}>Published this week</Text>
      {publishedCount === 0 ? (
        <Text style={{ ...emailStyles.text, color: EMAIL_COLORS.muted }}>Nothing went out this week.</Text>
      ) : (
        <>
          {publishedPosts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
          <MoreLine shown={publishedPosts.length} total={publishedCount} />
        </>
      )}

      <Text style={emailStyles.label}>Coming up in the next 7 days</Text>
      {upcomingCount === 0 ? (
        <Text style={{ ...emailStyles.text, color: EMAIL_COLORS.muted }}>Nothing scheduled yet. A good week to plan a few posts.</Text>
      ) : (
        <>
          {upcomingPosts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
          <MoreLine shown={upcomingPosts.length} total={upcomingCount} />
        </>
      )}

      <Text style={emailStyles.label}>Your account</Text>
      <EmailFacts
        items={[
          ["Plan", planLabel],
          ["Credits remaining", creditsRemaining.toLocaleString("en-US")],
          ...(hasReferralActivity && referralPending > 0 ? [["Referral earnings pending this month", formatMoney(referralPending)] as [string, string]] : []),
          ...(hasReferralActivity && referralPaid > 0 ? [["Referral earnings paid this month", formatMoney(referralPaid)] as [string, string]] : []),
        ]}
      />

      <EmailButton href={`${APP_URL}/content-hub`}>Open Content Hub</EmailButton>
      <Text style={emailStyles.muted}>
        Have a great week. You can turn these emails off any time in Settings &gt; Account &gt; Notifications.
      </Text>
    </EmailLayout>
  )
}
