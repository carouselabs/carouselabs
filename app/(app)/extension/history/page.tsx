// app/(app)/extension/history/page.tsx — Engage → Activity:
// comments per day (a GitHub-style grid of the last 13 weeks) and
// everything the extension wrote, kept for 90 days.
import { ActivityHead } from "@/components/extension/EngagePageHead"
import { ActivityHeatmap } from "@/components/extension/ActivityHeatmap"
import { HistoryList } from "@/components/extension/HistoryList"

export default function ExtensionActivityPage() {
  return (
    <>
      <ActivityHead platform="linkedin" />
      <ActivityHeatmap platform="linkedin" />
      <HistoryList />
    </>
  )
}
