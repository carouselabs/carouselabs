"use client"

// Client island for the (server-rendered) subscriptions page — exportToCSV
// needs Blob/URL/document, so the export button can't live in the server
// component itself. Data is passed down as a prop from the page's own query.
import { Download } from "lucide-react"
import { AdminButton } from "@/components/admin/ui"
import { exportToCSV } from "@/lib/adminExport"

export type SubscriptionExportRow = {
  email: string
  plan: string
  status: string
  creditsUsed: number
  creditsTotal: number
  extraCredits: number
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  providerId: string | null
}

export function SubscriptionsExportButton({ rows }: { rows: SubscriptionExportRow[] }) {
  return (
    <AdminButton
      variant="secondary"
      onClick={() =>
        exportToCSV(
          rows.map((r) => ({
            Email: r.email,
            Plan: r.plan,
            Status: r.status,
            CreditsUsed: r.creditsUsed,
            CreditsTotal: r.creditsTotal,
            ExtraCredits: r.extraCredits,
            PeriodEnd: r.currentPeriodEnd ?? "",
            CancelAtEnd: r.cancelAtPeriodEnd ? "yes" : "no",
            ProviderId: r.providerId ?? "",
          })),
          "carouselabs-subscriptions",
        )
      }
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </AdminButton>
  )
}
