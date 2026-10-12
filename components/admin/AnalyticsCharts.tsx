"use client"

// /admin/analytics — usage charts over the last 30 days.
import { useEffect, useState } from "react"
import { AdminCard, Spinner } from "@/components/admin/ui"
import { AdminBarChart, AdminDonut, AdminLineChart, CHART_COLORS } from "@/components/admin/charts"
import { useToast } from "@/components/admin/Toast"

type Analytics = {
  daily: { date: string; posts: number; credits: number; newUsers: number }[]
  growth: { date: string; totalUsers: number; proUsers: number; freeUsers: number }[]
  postsByType: { format: string; count: number }[]
}

// Fixed categorical assignment (validated palette order — never cycled).
const TYPE_META: Record<string, { label: string; color: string }> = {
  CAROUSEL: { label: "Carousel", color: CHART_COLORS.violet },
  SINGLE_IMAGE: { label: "Image", color: CHART_COLORS.teal },
  TEXT_ONLY: { label: "Caption", color: CHART_COLORS.amber },
  THUMBNAIL: { label: "Thumbnail", color: CHART_COLORS.rose },
}

export function AnalyticsCharts() {
  const { toast } = useToast()
  const [data, setData] = useState<Analytics | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(setData)
      .catch(() => {
        toast("Failed to load analytics", "error")
        setFailed(true)
      })
  }, [toast])

  if (failed) return <p className="text-label text-muted-foreground">Couldn&apos;t load analytics.</p>
  if (!data) return <Spinner label="Loading analytics…" />

  // Four named slices at most; any other format (e.g. custom posts) folds
  // into one neutral "Other" slice rather than reusing a colour.
  const named = data.postsByType.filter((t) => TYPE_META[t.format])
  const otherCount = data.postsByType.filter((t) => !TYPE_META[t.format]).reduce((a, t) => a + t.count, 0)
  const donutData = [
    ...named.map((t) => ({ name: TYPE_META[t.format].label, value: t.count, color: TYPE_META[t.format].color })),
    ...(otherCount > 0 ? [{ name: "Other", value: otherCount, color: CHART_COLORS.other }] : []),
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AdminCard title="Posts generated per day (last 30 days)">
        <AdminLineChart
          data={data.daily}
          xKey="date"
          series={[{ key: "posts", label: "Posts", color: CHART_COLORS.violet }]}
        />
      </AdminCard>

      <AdminCard title="Posts by type (all time)">
        {donutData.every((d) => d.value === 0) ? (
          <p className="py-16 text-center text-label text-muted-foreground/80">No posts yet</p>
        ) : (
          <AdminDonut data={donutData} />
        )}
      </AdminCard>

      <AdminCard title="New users per day (last 30 days)">
        <AdminBarChart data={data.daily} xKey="date" yKey="newUsers" label="New users" />
      </AdminCard>

      <AdminCard title="Credits used per day (est. from posts)">
        <AdminLineChart
          data={data.daily}
          xKey="date"
          series={[{ key: "credits", label: "Credits", color: CHART_COLORS.teal }]}
        />
      </AdminCard>

      <AdminCard title="Pro vs Free users over time" className="lg:col-span-2">
        <AdminLineChart
          data={data.growth}
          xKey="date"
          height={260}
          series={[
            { key: "proUsers", label: "Pro", color: CHART_COLORS.violet },
            { key: "freeUsers", label: "Free", color: CHART_COLORS.teal },
          ]}
        />
        <p className="mt-2 text-caption text-muted-foreground/80">
          Pro counts are approximated by the subscription row&apos;s creation date (upgrade
          timestamps aren&apos;t stored). Credit series are derived from post formats — there is no
          per-charge ledger.
        </p>
      </AdminCard>
    </div>
  )
}
