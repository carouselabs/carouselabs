// Every email shares one look (emails/EmailLayout.tsx + emails/theme.ts):
// the CarouseLabs logo (never an Engage extension icon), its own painted hero
// with the headline in the image (emails/art.ts), Fraunces headings, and a
// top-right link and sign-off that fit who it's for. Broadcasts and sequences
// (lib/broadcastRender.ts) match it. The prices and credit costs the emails
// quote must be the real ones.
import * as React from "react"
import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { EMAIL_IMAGES, EMPLOYEE_URL } from "@/emails/EmailLayout"
import { EMAIL_HEROES, heroAlt, type EmailHero } from "@/emails/art"
import { CREDIT_COSTS } from "@/lib/creditActions"
import { FREE_PLAN, GROWTH_PLAN, PRO_PLAN } from "@/lib/plans"
import { WelcomeEmail } from "@/emails/WelcomeEmail"
import { OnboardingCompleteEmail } from "@/emails/OnboardingCompleteEmail"
import { FirstPostEmail } from "@/emails/FirstPostEmail"
import { UpgradedToProEmail } from "@/emails/UpgradedToProEmail"
import { CreditsLowEmail } from "@/emails/CreditsLowEmail"
import { CreditsExhaustedEmail } from "@/emails/CreditsExhaustedEmail"
import { ExtraCreditsEmail } from "@/emails/ExtraCreditsEmail"
import { MonthlyResetEmail } from "@/emails/MonthlyResetEmail"
import { RenewalReminderEmail } from "@/emails/RenewalReminderEmail"
import { SubscriptionCancelledEmail } from "@/emails/SubscriptionCancelledEmail"
import { ScheduledPostFailedEmail } from "@/emails/ScheduledPostFailedEmail"
import { ScheduledPostPublishedEmail } from "@/emails/ScheduledPostPublishedEmail"
import { WeeklySummaryEmail } from "@/emails/WeeklySummaryEmail"
import { EngageAccessGrantedEmail } from "@/emails/EngageAccessGrantedEmail"
import { InternWelcomeEmail } from "@/emails/InternWelcomeEmail"
import { InternBroadcastEmail } from "@/emails/InternBroadcastEmail"
import { InternSupportReplyEmail } from "@/emails/InternSupportReplyEmail"
import { InternAbsentWarningEmail } from "@/emails/InternAbsentWarningEmail"
import { InternDailySummaryEmail } from "@/emails/InternDailySummaryEmail"
import { InternWeeklyPerformanceEmail } from "@/emails/InternWeeklyPerformanceEmail"
import { InternWeeklyDigestEmail } from "@/emails/InternWeeklyDigestEmail"
import { AdminNewSupportMessageEmail } from "@/emails/AdminNewSupportMessageEmail"
import { ContactMessageEmail } from "@/emails/ContactMessageEmail"
import { renderBroadcastEmailHtml } from "@/lib/broadcastRender"

const store = { linkedin: "https://store.example/linkedin", x: "https://store.example/x", reddit: "https://store.example/reddit" }
const post = { id: "p1", title: "Hooks that work", platform: "linkedin", publishedUrl: "https://linkedin.com/p/1" }

const USER: Record<string, React.ReactElement> = {
  welcome: <WelcomeEmail name="Priya" />,
  onboarding: <OnboardingCompleteEmail name="Priya" />,
  firstPost: <FirstPostEmail name="Priya" />,
  upgraded: <UpgradedToProEmail name="Priya" credits={30} />,
  creditsLow: <CreditsLowEmail name="Priya" creditsLeft={5} />,
  creditsOut: <CreditsExhaustedEmail name="Priya" />,
  extraCredits: <ExtraCreditsEmail name="Priya" creditsAdded={20} expiryDate="1 Dec 2026" />,
  monthlyReset: <MonthlyResetEmail name="Priya" credits={30} />,
  renewal: <RenewalReminderEmail name="Priya" renewalDate="21 Oct 2026" amount="$19.00" />,
  cancelled: <SubscriptionCancelledEmail name="Priya" />,
  postFailed: <ScheduledPostFailedEmail name="Priya" postTitle="Hooks" platform="linkedin" reason="Token expired" />,
  postPublished: <ScheduledPostPublishedEmail name="Priya" postTitle="Hooks" platform="linkedin" />,
  weekly: (
    <WeeklySummaryEmail
      name="Priya"
      publishedPosts={[post]}
      publishedCount={1}
      upcomingPosts={[]}
      upcomingCount={0}
      referralPending={0}
      referralPaid={0}
      hasReferralActivity={false}
      creditsRemaining={12}
      plan="PRO"
    />
  ),
  engageInvite: <EngageAccessGrantedEmail until={null} platform="x" storeUrls={store} />,
}

const INTERN: Record<string, React.ReactElement> = {
  internWelcome: (
    <InternWelcomeEmail name="Ravi" role="Designer" joinDate="1 Oct 2026" leaveAllowance={4} loginUrl="https://employee.carouselabs.com" email="ravi@example.com" />
  ),
  internBroadcast: <InternBroadcastEmail name="Ravi" subject="Holiday on Friday" body={"Office closed.\n\nSee you Monday."} />,
  supportReply: <InternSupportReplyEmail name="Ravi" />,
  absent: <InternAbsentWarningEmail name="Ravi" date="17 Oct 2026" presentDays={10} absentDays={1} attendanceRate={91} />,
  daily: <InternDailySummaryEmail name="Ravi" date="17 Oct 2026" tasksCompleted={[{ name: "Post", points: 5 }]} pointsToday={5} totalPoints={120} />,
  performance: (
    <InternWeeklyPerformanceEmail
      name="Ravi"
      weekLabel="13–17 Oct"
      activeInternCount={6}
      rankThisWeek={2}
      pointsThisWeek={42}
      rankLastWeek={4}
      rankDelta={2}
      presentDays={5}
      absentDays={0}
      perfectAttendance
      isHighestPoints={false}
      isMostImproved
      tone="moved_up"
    />
  ),
}

const ADMIN: Record<string, React.ReactElement> = {
  digest: (
    <InternWeeklyDigestEmail
      weekLabel="13–17 Oct"
      interns={[{ id: "i1", name: "Ravi", role: null, pointsThisWeek: 42, present: 5, absent: 0, halfDay: 0, leave: 0, newNotes: 0, flag: "good" }]}
    />
  ),
  supportMessage: <AdminNewSupportMessageEmail internName="Ravi" message="Can I take Friday off?" detailUrl="https://admin.carouselabs.com/x" />,
  contact: <ContactMessageEmail name="Sam" email="sam@example.com" subject="Pricing" message="Do you have a team plan?" />,
}

const html = (el: React.ReactElement) => renderToStaticMarkup(el)
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

describe("every email shares the CarouseLabs look", () => {
  const all = { ...USER, ...INTERN, ...ADMIN }

  it.each(Object.keys(all))("%s: CarouseLabs logo, Fraunces, no Engage icon, old purple or emoji", (key) => {
    const out = html(all[key])
    expect(out).toContain(`src="${EMAIL_IMAGES}/logo.png"`)
    expect(out).toContain('alt="CarouseLabs"')
    expect(out).toContain("family=Fraunces")
    expect(out).not.toContain("images/extensions/engage")
    expect(out).not.toContain("#7C3AED")
    expect(out).not.toMatch(EMOJI)
  })

  it.each(Object.keys(USER))("%s: for customers — Sign in, signed by the team", (key) => {
    const out = html(USER[key])
    expect(out).toContain(">Sign in<")
    expect(out).toContain("The CarouseLabs Team")
  })

  it.each(Object.keys(INTERN))("%s: for interns — links their portal", (key) => {
    const out = html(INTERN[key])
    expect(out).toContain(">Open portal<")
    expect(out).toContain(`href="${EMPLOYEE_URL}"`)
    expect(out).toContain("The CarouseLabs Team")
  })

  it.each(Object.keys(ADMIN))("%s: for admin — no team sign-off", (key) => {
    const out = html(ADMIN[key])
    expect(out).toContain(">Open admin<")
    expect(out).not.toContain("The CarouseLabs Team")
  })

  it("each email opens with its own hero, whose alt text is the headline in the image", () => {
    const used = new Map<string, string>()
    for (const [key, el] of Object.entries(all)) {
      const hero = html(el).match(/src="[^"]*\/hero-([a-z-]+)\.jpg"/)?.[1] as EmailHero | undefined
      expect(hero, key).toBeDefined()
      expect(Object.keys(EMAIL_HEROES)).toContain(hero)
      expect(html(el)).toContain(`alt="${heroAlt(hero!).replace(/'/g, "&#x27;")}"`)
      expect(used.get(hero!), `${key} reuses ${used.get(hero!)}'s hero`).toBeUndefined()
      used.set(hero!, key)
    }
    expect(heroAlt("welcome")).toBe("Welcome to CarouseLabs.")
  })

  it("every hero, sticker and the logo it points to exists in public/images/email", () => {
    const dir = path.join(process.cwd(), "public/images/email")
    const files = ["logo.png", "mark.png", ...Object.keys(EMAIL_HEROES).map((id) => `hero-${id}.jpg`)]
    for (const el of Object.values(all)) {
      for (const m of html(el).matchAll(/images\/email\/(sticker-[a-z]+\.png)/g)) files.push(m[1])
    }
    for (const file of new Set(files)) expect(fs.existsSync(path.join(dir, file)), file).toBe(true)
  })

  it("quotes the real credit costs, plan prices and free credits", () => {
    const costs = [
      `${CREDIT_COSTS.caption_only} credits`,
      `${CREDIT_COSTS.image_caption} credits`,
      `${CREDIT_COSTS.carousel} credits`,
    ]
    for (const cost of costs) {
      expect(html(USER.upgraded)).toContain(cost)
      expect(html(USER.creditsLow)).toContain(cost)
    }
    const firstPost = html(USER.firstPost)
    expect(firstPost).toContain(`$${PRO_PLAN.price}`)
    expect(firstPost).toContain(`$${GROWTH_PLAN.price}`)
    expect(firstPost).toContain(PRO_PLAN.credits.split(" ")[0])
    expect(firstPost).toContain(GROWTH_PLAN.credits.split(" ")[0])
    expect(html(USER.welcome)).toContain(`>${parseInt(FREE_PLAN.credits)}<`)
    expect(html(<UpgradedToProEmail name="Priya" credits={1000} />)).toContain("1,000 credits")
  })

  it("puts dates and amounts in a facts panel", () => {
    const out = html(USER.renewal)
    expect(out).toContain("Renewal date")
    expect(out).toContain("21 Oct 2026")
    expect(out).toContain("$19.00")
  })

  it("escapes what someone typed into the contact form", () => {
    const out = html(<ContactMessageEmail name="Sam" email="sam@example.com" subject="Hi" message={'<script>alert("x")</script>'} />)
    expect(out).toContain("&lt;script&gt;")
    expect(out).not.toContain("<script>")
  })
})

describe("broadcast and sequence emails match", () => {
  const out = renderBroadcastEmailHtml("<b>Big</b> news", "Hello **there**.\n\nRead [the post](https://carouselabs.com/blog).")

  it("has the logo, hero, serif heading and footer", () => {
    expect(out).toContain(`src="${EMAIL_IMAGES}/logo.png"`)
    expect(out).toContain(`src="${EMAIL_IMAGES}/hero-broadcast.jpg"`)
    expect(out).toContain('alt="News from CarouseLabs."')
    expect(out).toContain("font-family:Fraunces, Georgia")
    expect(out).toContain("CarouseLabs — your AI social media content studio.")
    expect(out).not.toContain("#7C3AED")
  })

  it("still escapes the subject and renders the body's bold and links", () => {
    expect(out).toContain("&lt;b&gt;Big&lt;/b&gt; news")
    expect(out).toContain("<strong>there</strong>")
    expect(out).toContain('<a href="https://carouselabs.com/blog" style="color:#6D28D9">the post</a>')
  })
})
