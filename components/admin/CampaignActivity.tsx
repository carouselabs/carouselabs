"use client"

// A campaign's first 48 hours (/api/admin/campaigns/[id]/activity): how many
// people had seen and clicked it by each hour after their email went, the
// links they clicked, and where they read it. People only (lib/emailScanners.ts).
import { useEffect, useState } from "react"
import { AdminCard } from "@/components/admin/ui"
import { AdminLineChart, CHART_COLORS } from "@/components/admin/charts"
import { BarList } from "./EmailReportParts"

type Activity = {
  timeline: { hour: number; seen: number; clicked: number }[]
  links: { link: string; clicks: number; people: number }[]
  apps: { app: string; people: number }[]
}

const shortLink = (link: string) => link.replace(/^https:\/\/(www\.)?carouselabs\.com/, "") || "carouselabs.com"
const people = (n: number) => `${n} ${n === 1 ? "person" : "people"}`

export function CampaignActivity({ campaignId, refreshKey }: { campaignId: string; refreshKey?: unknown }) {
  const [activity, setActivity] = useState<Activity | null>(null)
  useEffect(() => {
    let live = true
    fetch(`/api/admin/campaigns/${campaignId}/activity`)
      .then((res) => (res.ok ? res.json() : null))
      // Anything else (an error, an old answer) just leaves the box out.
      .then((data: Activity | null) => live && Array.isArray(data?.timeline) && setActivity(data))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [campaignId, refreshKey])

  if (!activity) return null
  const last = activity.timeline.at(-1)
  if (!last || (last.seen === 0 && activity.links.length === 0)) return null
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <AdminCard title="The first 48 hours: people who had seen and clicked it">
        <AdminLineChart
          data={activity.timeline}
          xKey="hour"
          formatX={(h) => `${h}h after sending`}
          height={220}
          series={[
            { key: "seen", label: "Seen", color: CHART_COLORS.teal },
            { key: "clicked", label: "Clicked", color: CHART_COLORS.amber },
          ]}
        />
      </AdminCard>
      <div className="flex flex-col gap-6">
        <AdminCard title="Links they clicked">
          <BarList
            rows={activity.links.map((l) => ({ label: shortLink(l.link), title: l.link, value: l.people }))}
            unit={people}
            empty="No clicks yet."
          />
        </AdminCard>
        <AdminCard title="Where they read it">
          <BarList rows={activity.apps.map((a) => ({ label: a.app, value: a.people }))} unit={people} empty="Nothing yet." />
        </AdminCard>
      </div>
    </div>
  )
}
