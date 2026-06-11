// app/(app)/idea/[id]/page.tsx
import { auth } from "@clerk/nextjs/server"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { dbEnumsToRawCategory } from "@/lib/ai/parsers/ideas"
import { BreakdownView } from "@/components/idea/BreakdownView"
import { FormatPicker } from "@/components/idea/FormatPicker"
import { TrackVisit } from "@/components/history/TrackVisit"
import type { BreakdownOutline } from "@/lib/types/breakdown"
import type { RawCategory } from "@/lib/ai/parsers/ideas"

const CATEGORY_COLORS: Record<RawCategory, { color: string; bg: string }> = {
  "Latest News": { color: "#93C5FD", bg: "rgba(147,197,253,0.10)" },
  "Trending": { color: "#6EE7B7", bg: "rgba(110,231,183,0.10)" },
  "Industry": { color: "#C4B5FD", bg: "rgba(196,181,253,0.10)" },
  "Random": { color: "#FCD34D", bg: "rgba(252,211,77,0.10)" },
}

export default async function IdeaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId: clerkId } = await auth()
  if (!clerkId) redirect("/sign-in")

  const user = await db.user.findUnique({
    where: { clerkId },
    include: { subscription: true },
  })
  if (!user) redirect("/sign-in")

  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      breakdowns: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  })

  if (!idea || idea.userId !== user.id) notFound()

  const rawCategory = dbEnumsToRawCategory(idea.mode, idea.category)
  const categoryStyle = CATEGORY_COLORS[rawCategory]
  const plan = (user.subscription?.plan ?? "FREE") as "FREE" | "PRO"
  const cachedBreakdown = (idea.breakdowns[0]?.outline ?? null) as unknown as BreakdownOutline | null

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {/* Record this idea visit in history (BREAKDOWN — never downgrades progress) */}
      <TrackVisit ideaId={id} status="BREAKDOWN" />

      {/* Idea header */}
      <div className="flex flex-col gap-3">
        <span
          className="self-start text-[11px] font-semibold px-2 py-0.5 rounded-full tracking-wide"
          style={{ color: categoryStyle.color, backgroundColor: categoryStyle.bg }}
        >
          {rawCategory}
        </span>
        <h1 className="text-[22px] font-semibold text-[rgba(255,255,255,0.9)] leading-[1.35]">
          {idea.hook}
        </h1>
        <p className="text-[12px] text-[rgba(255,255,255,0.28)]">
          Created {new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Breakdown — client component handles auto-generation */}
      <BreakdownView ideaId={id} initialBreakdown={cachedBreakdown} />

      {/* Divider */}
      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* Format picker */}
      <FormatPicker ideaId={id} plan={plan} />
    </div>
  )
}
