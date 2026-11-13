// app/(app)/extension/x/history/page.tsx — Engage for X → Activity:
// replies per day (a GitHub-style grid of the last 13 weeks) and
// everything the extension wrote, kept for 90 days.
import { ActivityHead } from "@/components/extension/EngagePageHead"
import { ActivityHeatmap } from "@/components/extension/ActivityHeatmap"
import { HistoryList } from "@/components/extension/HistoryList"

export default function ExtensionXActivityPage() {
  return (
    <>
      <ActivityHead platform="x" />
      <ActivityHeatmap platform="x" />
      <HistoryList platform="x" />
    </>
  )
}
