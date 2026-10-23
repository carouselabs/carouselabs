"use client"

// Payment history for the extension's $15/month plan, read live from Lemon
// Squeezy through app/api/ext/payments.
import { useEffect, useState } from "react"
import { ExternalLink } from "lucide-react"
import { errorMessage, extApi, shortDate, type ExtPayment } from "./api"
import type { EngagePlatform } from "@/lib/engage/features"

const STATUS_STYLES: Record<string, string> = {
  paid: "text-success bg-success-soft",
  pending: "text-warning bg-warning-soft",
  refunded: "text-muted-foreground bg-surface-muted",
  partial_refund: "text-muted-foreground bg-surface-muted",
  void: "text-muted-foreground bg-surface-muted",
}

// platform "x": the X extension's payments (sold separately).
export function PaymentsList({ platform = "linkedin" }: { platform?: EngagePlatform }) {
  const [payments, setPayments] = useState<ExtPayment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    extApi<{ payments: ExtPayment[] }>(platform === "linkedin" ? "/api/ext/payments" : `/api/ext/payments?platform=${platform}`)
      .then((res) => setPayments(res.payments))
      .catch((err) => setError(errorMessage(err)))
  }, [platform])

  if (error) return <p className="text-label text-danger">{error}</p>
  if (!payments) return <p className="text-label text-muted-foreground">Loading payments…</p>
  if (payments.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-border p-8 text-center text-label text-muted-foreground">
        No payments yet. Your $15/month payments will show here.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface-raised">
      <table className="w-full min-w-[560px] text-left text-label">
        <thead>
          <tr className="border-b border-border text-caption text-muted-foreground">
            <th className="px-5 py-3 font-semibold">Date</th>
            <th className="px-5 py-3 font-semibold">What</th>
            <th className="px-5 py-3 font-semibold">Amount</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Card</th>
            <th className="px-5 py-3 font-semibold text-right">Invoice</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0">
              <td className="px-5 py-3.5 text-foreground">{p.date ? shortDate(p.date) : "—"}</td>
              <td className="px-5 py-3.5 text-foreground">{p.reason}</td>
              <td className="px-5 py-3.5 font-semibold tabular-nums text-foreground">{p.amount}</td>
              <td className="px-5 py-3.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${
                    STATUS_STYLES[p.status] ?? "text-muted-foreground bg-surface-muted"
                  }`}
                >
                  {p.statusLabel}
                </span>
              </td>
              <td className="px-5 py-3.5 text-muted-foreground">{p.card ?? "—"}</td>
              <td className="px-5 py-3.5 text-right">
                {p.invoiceUrl ? (
                  <a
                    href={p.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                  >
                    Download <ExternalLink size={12} />
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
